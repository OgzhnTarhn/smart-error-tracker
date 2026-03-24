import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { createHash, randomBytes, scryptSync, timingSafeEqual } from 'crypto';

const MEMBER_SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 7;
const DEMO_SESSION_TTL_MS = 1000 * 60 * 60 * 12;

function sha256(input: string) {
  return createHash('sha256').update(input).digest('hex');
}

function normalizeEmail(value: string | undefined | null) {
  return (value ?? '').trim().toLowerCase();
}

function normalizeName(value: string | undefined | null) {
  return (value ?? '').trim();
}

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function hashPassword(password: string) {
  const salt = randomBytes(16).toString('hex');
  const derived = scryptSync(password, salt, 64).toString('hex');
  return `scrypt:${salt}:${derived}`;
}

function verifyPassword(password: string, storedHash: string | null | undefined) {
  if (!storedHash) return false;

  const [algorithm, salt, expectedHash] = storedHash.split(':');
  if (algorithm !== 'scrypt' || !salt || !expectedHash) return false;

  const actualHash = scryptSync(password, salt, 64).toString('hex');
  const left = Buffer.from(actualHash, 'hex');
  const right = Buffer.from(expectedHash, 'hex');
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}

function makeSessionToken() {
  return `sess_${randomBytes(24).toString('hex')}`;
}

function makeProjectApiKey() {
  return `set_${randomBytes(24).toString('hex')}`;
}

function sessionExpiry(mode: 'demo' | 'member') {
  return new Date(Date.now() + (mode === 'demo' ? DEMO_SESSION_TTL_MS : MEMBER_SESSION_TTL_MS));
}

type ProjectCandidate = {
  id: string;
  name: string;
  key: string;
  createdAt: Date;
  _count: {
    events: number;
    groups: number;
    memberships: number;
  };
};

@Injectable()
export class AuthService {
  constructor(private readonly prisma: PrismaService) {}

  isDemoUserEmail(email: string | null | undefined) {
    return normalizeEmail(email) === this.getDemoIdentity().email;
  }

  private buildSessionIdentityPayload(
    session: Awaited<ReturnType<AuthService['getSessionFromToken']>>,
  ) {
    if (!session) {
      return null;
    }

    return {
      user: {
        id: session.user.id,
        name: session.user.name,
        email: session.user.email,
      },
      mode: this.isDemoUserEmail(session.user.email)
        ? ('demo' as const)
        : ('member' as const),
      project: session.dashboardApiKey?.project
        ? {
            id: session.dashboardApiKey.project.id,
            name: session.dashboardApiKey.project.name,
            key: session.dashboardApiKey.project.key,
          }
        : null,
      dashboardApiKeyAvailable: Boolean(session.dashboardApiKeyId),
    };
  }

  private getDemoIdentity() {
    return {
      email: normalizeEmail(process.env.DEMO_USER_EMAIL || 'demo@smarterror.dev'),
      name: normalizeName(process.env.DEMO_USER_NAME || 'Demo Analyst'),
      projectName: normalizeName(process.env.DEMO_PROJECT_NAME || 'demo'),
      projectId: normalizeName(process.env.DEMO_PROJECT_ID || ''),
      projectKey: normalizeName(process.env.DEMO_PROJECT_KEY || ''),
    };
  }

  private pickBestProject(candidates: ProjectCandidate[]) {
    return [...candidates].sort((left, right) => {
      if (right._count.events !== left._count.events) {
        return right._count.events - left._count.events;
      }
      if (right._count.groups !== left._count.groups) {
        return right._count.groups - left._count.groups;
      }
      if (right._count.memberships !== left._count.memberships) {
        return right._count.memberships - left._count.memberships;
      }

      return right.createdAt.getTime() - left.createdAt.getTime();
    })[0] ?? null;
  }

  private async findPreferredProject(input: {
    projectName: string;
    projectId?: string;
    projectKey?: string;
  }) {
    if (input.projectId) {
      const byId = await this.prisma.project.findUnique({
        where: { id: input.projectId },
      });
      if (byId) return byId;
    }

    if (input.projectKey) {
      const byKey = await this.prisma.project.findFirst({
        where: {
          key: { equals: input.projectKey, mode: 'insensitive' },
        },
      });
      if (byKey) return byKey;
    }

    const namedCandidates = input.projectName
      ? await this.prisma.project.findMany({
          where: {
            OR: [
              { name: { equals: input.projectName, mode: 'insensitive' } },
              { key: { equals: input.projectName, mode: 'insensitive' } },
            ],
          },
          include: {
            _count: {
              select: {
                events: true,
                groups: true,
                memberships: true,
              },
            },
          },
        })
      : [];

    const preferred = this.pickBestProject(namedCandidates);
    if (preferred) {
      return this.prisma.project.findUnique({
        where: { id: preferred.id },
      });
    }

    const allProjects = await this.prisma.project.findMany({
      include: {
        _count: {
          select: {
            events: true,
            groups: true,
            memberships: true,
          },
        },
      },
    });

    const fallback = this.pickBestProject(allProjects);
    if (!fallback) return null;

    return this.prisma.project.findUnique({
      where: { id: fallback.id },
    });
  }

  private async ensureMembership(userId: string, projectId: string, role = 'member') {
    const existing = await this.prisma.projectMembership.findUnique({
      where: {
        userId_projectId: {
          userId,
          projectId,
        },
      },
      include: {
        project: true,
      },
    });

    if (existing) {
      if (!existing.lastAccessedAt) {
        await this.prisma.projectMembership.update({
          where: { id: existing.id },
          data: { lastAccessedAt: new Date() },
        });
      }

      return existing;
    }

    return this.prisma.projectMembership.create({
      data: {
        userId,
        projectId,
        role,
        lastAccessedAt: new Date(),
      },
      include: {
        project: true,
      },
    });
  }

  private async createDashboardApiKey(projectId: string, label: string) {
    const rawApiKey = makeProjectApiKey();
    const keyHash = sha256(rawApiKey);

    const apiKey = await this.prisma.apiKey.create({
      data: {
        projectId,
        keyHash,
        label,
      },
    });

    return {
      apiKey,
      rawApiKey,
    };
  }

  private async issueSessionForUser(input: {
    userId: string;
    mode: 'demo' | 'member';
    preferredProjectId?: string | null;
  }) {
    const user = await this.prisma.user.findUnique({
      where: { id: input.userId },
    });

    if (!user) {
      return { ok: false as const, error: 'user_not_found' };
    }

    const membership = await this.prisma.projectMembership.findFirst({
      where: {
        userId: input.userId,
        ...(input.preferredProjectId
          ? {
              projectId: input.preferredProjectId,
            }
          : {}),
      },
      orderBy: [{ lastAccessedAt: 'desc' }, { createdAt: 'asc' }],
      include: {
        project: true,
      },
    });

    let dashboardApiKey: string | null = null;
    let dashboardApiKeyId: string | null = null;

    if (membership?.projectId) {
      const issuedKey = await this.createDashboardApiKey(
        membership.projectId,
        `${input.mode}-dashboard-session`,
      );

      dashboardApiKey = issuedKey.rawApiKey;
      dashboardApiKeyId = issuedKey.apiKey.id;

      await this.prisma.projectMembership.update({
        where: { id: membership.id },
        data: { lastAccessedAt: new Date() },
      });
    }

    const sessionToken = makeSessionToken();
    await this.prisma.session.create({
      data: {
        userId: input.userId,
        tokenHash: sha256(sessionToken),
        expiresAt: sessionExpiry(input.mode),
        dashboardApiKeyId,
      },
    });

    return {
      ok: true as const,
      sessionToken,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
      },
      mode: input.mode,
      project: membership?.project
        ? {
            id: membership.project.id,
            name: membership.project.name,
            key: membership.project.key,
          }
        : null,
      dashboardApiKey,
    };
  }

  async getDemoAccess() {
    const demo = this.getDemoIdentity();
    const project = await this.findPreferredProject(demo);

    return {
      ok: true,
      enabled: Boolean(project),
      user: {
        name: demo.name,
        email: demo.email,
      },
      project: project
        ? {
            id: project.id,
            name: project.name,
            key: project.key,
          }
        : null,
    };
  }

  async demoLogin() {
    const demo = this.getDemoIdentity();
    const project = await this.findPreferredProject(demo);
    if (!project) {
      return { ok: false, error: 'demo_project_not_found' };
    }

    let user = await this.prisma.user.findUnique({
      where: { email: demo.email },
    });

    if (!user) {
      user = await this.prisma.user.create({
        data: {
          email: demo.email,
          name: demo.name,
          passwordHash: null,
        },
      });
    }

    await this.ensureMembership(user.id, project.id, 'demo');

    return this.issueSessionForUser({
      userId: user.id,
      mode: 'demo',
      preferredProjectId: project.id,
    });
  }

  async register(input: { name: string; email: string; password: string }) {
    const name = normalizeName(input.name);
    const email = normalizeEmail(input.email);
    const password = input.password ?? '';

    if (name.length < 2) {
      return { ok: false, error: 'name_too_short' };
    }
    if (!isValidEmail(email)) {
      return { ok: false, error: 'invalid_email' };
    }
    if (password.length < 8) {
      return { ok: false, error: 'password_too_short' };
    }

    const existing = await this.prisma.user.findUnique({
      where: { email },
    });

    if (existing) {
      return { ok: false, error: 'email_in_use' };
    }

    const user = await this.prisma.user.create({
      data: {
        name,
        email,
        passwordHash: hashPassword(password),
      },
    });

    return this.issueSessionForUser({
      userId: user.id,
      mode: 'member',
    });
  }

  async login(input: { email: string; password: string }) {
    const email = normalizeEmail(input.email);
    const password = input.password ?? '';

    if (!isValidEmail(email) || !password) {
      return { ok: false, error: 'invalid_credentials' };
    }

    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    if (!user || !verifyPassword(password, user.passwordHash)) {
      return { ok: false, error: 'invalid_credentials' };
    }

    return this.issueSessionForUser({
      userId: user.id,
      mode: 'member',
    });
  }

  async getSessionFromToken(token: string | undefined | null) {
    const normalized = (token ?? '').trim();
    if (!normalized) return null;

    const session = await this.prisma.session.findUnique({
      where: {
        tokenHash: sha256(normalized),
      },
      include: {
        user: true,
        dashboardApiKey: {
          include: {
            project: true,
          },
        },
      },
    });

    if (!session) return null;
    if (session.revokedAt) return null;
    if (session.expiresAt.getTime() <= Date.now()) return null;

    const lastSeenAt = new Date();
    await this.prisma.session.update({
      where: { id: session.id },
      data: { lastSeenAt },
    });
    session.lastSeenAt = lastSeenAt;

    return session;
  }

  async getMe(token: string | undefined | null) {
    const session = await this.getSessionFromToken(token);
    if (!session) {
      return { ok: false, error: 'unauthorized' };
    }

    const identity = this.buildSessionIdentityPayload(session);
    if (!identity) {
      return { ok: false, error: 'unauthorized' };
    }

    return {
      ok: true,
      ...identity,
    };
  }

  async getProfile(token: string | undefined | null) {
    const session = await this.getSessionFromToken(token);
    if (!session) {
      return { ok: false, error: 'unauthorized' };
    }

    const identity = this.buildSessionIdentityPayload(session);
    if (!identity) {
      return { ok: false, error: 'unauthorized' };
    }

    return {
      ok: true,
      ...identity,
      currentSession: {
        createdAt: session.createdAt,
        lastSeenAt: session.lastSeenAt,
        expiresAt: session.expiresAt,
      },
    };
  }

  async updateProfile(
    token: string | undefined | null,
    input: { name?: string; email?: string },
  ) {
    const session = await this.getSessionFromToken(token);
    if (!session) {
      return { ok: false, error: 'unauthorized' };
    }

    if (this.isDemoUserEmail(session.user.email)) {
      return { ok: false, error: 'demo_account_locked' };
    }

    const name = normalizeName(input.name);
    const email = normalizeEmail(input.email);

    if (name.length < 2) {
      return { ok: false, error: 'name_too_short' };
    }
    if (!isValidEmail(email)) {
      return { ok: false, error: 'invalid_email' };
    }

    const existing = await this.prisma.user.findUnique({
      where: { email },
    });

    if (existing && existing.id !== session.userId) {
      return { ok: false, error: 'email_in_use' };
    }

    const user = await this.prisma.user.update({
      where: { id: session.userId },
      data: {
        name,
        email,
      },
    });

    session.user = user;
    const identity = this.buildSessionIdentityPayload(session);
    if (!identity) {
      return { ok: false, error: 'unauthorized' };
    }

    return {
      ok: true,
      ...identity,
    };
  }

  async changePassword(
    token: string | undefined | null,
    input: { currentPassword?: string; newPassword?: string },
  ) {
    const session = await this.getSessionFromToken(token);
    if (!session) {
      return { ok: false, error: 'unauthorized' };
    }

    if (this.isDemoUserEmail(session.user.email)) {
      return { ok: false, error: 'demo_account_locked' };
    }

    const currentPassword = input.currentPassword ?? '';
    const newPassword = input.newPassword ?? '';

    if (!currentPassword) {
      return { ok: false, error: 'current_password_required' };
    }
    if (newPassword.length < 8) {
      return { ok: false, error: 'password_too_short' };
    }
    if (!verifyPassword(currentPassword, session.user.passwordHash)) {
      return { ok: false, error: 'invalid_current_password' };
    }
    if (verifyPassword(newPassword, session.user.passwordHash)) {
      return { ok: false, error: 'password_unchanged' };
    }

    await this.prisma.user.update({
      where: { id: session.userId },
      data: {
        passwordHash: hashPassword(newPassword),
      },
    });

    return { ok: true };
  }

  async bindTokenToProject(
    token: string | undefined | null,
    projectId: string,
    role = 'owner',
  ) {
    const session = await this.getSessionFromToken(token);
    if (!session) return false;

    await this.ensureMembership(session.userId, projectId, role);
    return true;
  }

  async logout(token: string | undefined | null) {
    const session = await this.getSessionFromToken(token);
    if (!session) {
      return { ok: false, error: 'unauthorized' };
    }

    await this.prisma.session.update({
      where: { id: session.id },
      data: { revokedAt: new Date() },
    });

    if (session.dashboardApiKeyId) {
      await this.prisma.apiKey.update({
        where: { id: session.dashboardApiKeyId },
        data: { revokedAt: new Date() },
      });
    }

    return { ok: true };
  }
}
