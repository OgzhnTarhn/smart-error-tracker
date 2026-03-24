import {
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { createHash, randomBytes } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { AuthService } from '../auth/auth.service';

const MANAGEABLE_WORKSPACE_ROLES = new Set(['owner', 'member']);

function sha256(input: string) {
  return createHash('sha256').update(input).digest('hex');
}

function getBearerToken(authorization: string | undefined) {
  const value = authorization?.trim() ?? '';
  if (!value.toLowerCase().startsWith('bearer ')) return '';
  return value.slice(7).trim();
}

function makeProjectKey() {
  return `proj_${randomBytes(16).toString('hex')}`;
}

function makeProjectApiKey() {
  return `set_${randomBytes(24).toString('hex')}`;
}

function normalizeWorkspaceRole(role: string | undefined) {
  const normalized = role?.trim().toLowerCase() ?? '';
  if (!normalized) return null;
  return MANAGEABLE_WORKSPACE_ROLES.has(normalized) ? normalized : null;
}

@Controller('workspace')
export class WorkspaceController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly authService: AuthService,
  ) {}

  private async getSessionContext(authorization: string | undefined) {
    const session = await this.authService.getSessionFromToken(
      getBearerToken(authorization),
    );

    if (!session) {
      return null;
    }

    return {
      session,
      isDemo: this.authService.isDemoUserEmail(session.user.email),
    };
  }

  private async getProjectMembership(userId: string, projectId: string) {
    return this.prisma.projectMembership.findUnique({
      where: {
        userId_projectId: {
          userId,
          projectId,
        },
      },
      select: {
        id: true,
        role: true,
      },
    });
  }

  private async getManageableProjectMember(projectId: string, memberId: string) {
    return this.prisma.projectMembership.findFirst({
      where: {
        id: memberId,
        projectId,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });
  }

  private async countProjectOwners(projectId: string) {
    return this.prisma.projectMembership.count({
      where: {
        projectId,
        role: 'owner',
      },
    });
  }

  @Get('projects')
  async listProjects(
    @Headers('authorization') authorization: string | undefined,
  ) {
    const context = await this.getSessionContext(authorization);
    if (!context) return { ok: false, error: 'unauthorized' };

    const memberships = await this.prisma.projectMembership.findMany({
      where: {
        userId: context.session.userId,
      },
      orderBy: [{ lastAccessedAt: 'desc' }, { createdAt: 'desc' }],
      include: {
        project: {
          include: {
            _count: {
              select: {
                apiKeys: true,
              },
            },
          },
        },
      },
    });

    return {
      ok: true,
      projects: memberships.map((membership) => ({
        id: membership.project.id,
        name: membership.project.name,
        key: membership.project.key,
        createdAt: membership.project.createdAt,
        apiKeyCount: membership.project._count.apiKeys,
        role: membership.role,
        lastAccessedAt: membership.lastAccessedAt,
      })),
    };
  }

  @Post('projects')
  async createProject(
    @Headers('authorization') authorization: string | undefined,
    @Body() body: { name?: string; label?: string },
  ) {
    const context = await this.getSessionContext(authorization);
    if (!context) return { ok: false, error: 'unauthorized' };
    if (context.isDemo) {
      return { ok: false, error: 'demo_access_read_only' };
    }

    const name = (body?.name ?? '').trim();
    if (!name) return { ok: false, error: 'missing_name' };

    const rawApiKey = makeProjectApiKey();
    const keyHash = sha256(rawApiKey);

    const project = await this.prisma.$transaction(async (tx) => {
      const createdProject = await tx.project.create({
        data: {
          name,
          key: makeProjectKey(),
        },
      });

      await tx.apiKey.create({
        data: {
          projectId: createdProject.id,
          keyHash,
          label: body?.label?.trim() || 'default',
        },
      });

      await tx.projectMembership.create({
        data: {
          userId: context.session.userId,
          projectId: createdProject.id,
          role: 'owner',
          lastAccessedAt: new Date(),
        },
      });

      return createdProject;
    });

    return {
      ok: true,
      project: {
        id: project.id,
        name: project.name,
        key: project.key,
      },
      apiKey: rawApiKey,
    };
  }

  @Get('projects/:id/keys')
  async listProjectApiKeys(
    @Headers('authorization') authorization: string | undefined,
    @Param('id') projectId: string,
  ) {
    const context = await this.getSessionContext(authorization);
    if (!context) return { ok: false, error: 'unauthorized' };

    const membership = await this.getProjectMembership(
      context.session.userId,
      projectId,
    );

    if (!membership) return { ok: false, error: 'project_not_found' };

    const keys = await this.prisma.apiKey.findMany({
      where: {
        projectId,
      },
      orderBy: {
        createdAt: 'desc',
      },
      select: {
        id: true,
        label: true,
        createdAt: true,
        revokedAt: true,
      },
    });

    return {
      ok: true,
      keys,
    };
  }

  @Post('projects/:id/keys')
  async createProjectApiKey(
    @Headers('authorization') authorization: string | undefined,
    @Param('id') projectId: string,
    @Body() body: { label?: string },
  ) {
    const context = await this.getSessionContext(authorization);
    if (!context) return { ok: false, error: 'unauthorized' };
    if (context.isDemo) {
      return { ok: false, error: 'demo_access_read_only' };
    }

    const membership = await this.getProjectMembership(
      context.session.userId,
      projectId,
    );

    if (!membership) return { ok: false, error: 'project_not_found' };

    const rawApiKey = makeProjectApiKey();
    const keyHash = sha256(rawApiKey);

    const apiKey = await this.prisma.apiKey.create({
      data: {
        projectId,
        keyHash,
        label: body?.label?.trim() || 'Generated Key',
      },
    });

    return {
      ok: true,
      apiKey: rawApiKey,
      keyId: apiKey.id,
    };
  }

  @Get('projects/:id/members')
  async listProjectMembers(
    @Headers('authorization') authorization: string | undefined,
    @Param('id') projectId: string,
  ) {
    const context = await this.getSessionContext(authorization);
    if (!context) return { ok: false, error: 'unauthorized' };

    const membership = await this.getProjectMembership(
      context.session.userId,
      projectId,
    );
    if (!membership) return { ok: false, error: 'project_not_found' };

    const members = await this.prisma.projectMembership.findMany({
      where: {
        projectId,
      },
      orderBy: [{ role: 'asc' }, { createdAt: 'asc' }],
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    return {
      ok: true,
      members: members.map((item) => ({
        id: item.id,
        role: item.role,
        createdAt: item.createdAt,
        lastAccessedAt: item.lastAccessedAt,
        user: item.user,
      })),
    };
  }

  @Post('projects/:id/members')
  async addProjectMember(
    @Headers('authorization') authorization: string | undefined,
    @Param('id') projectId: string,
    @Body() body: { email?: string; role?: string },
  ) {
    const context = await this.getSessionContext(authorization);
    if (!context) return { ok: false, error: 'unauthorized' };
    if (context.isDemo) {
      return { ok: false, error: 'demo_access_read_only' };
    }

    const membership = await this.getProjectMembership(
      context.session.userId,
      projectId,
    );
    if (!membership) return { ok: false, error: 'project_not_found' };
    if (membership.role !== 'owner') {
      return { ok: false, error: 'forbidden' };
    }

    const email = (body?.email ?? '').trim().toLowerCase();
    if (!email) return { ok: false, error: 'missing_email' };

    const nextRole = body?.role?.trim()
      ? normalizeWorkspaceRole(body.role)
      : 'member';
    if (!nextRole) return { ok: false, error: 'invalid_role' };

    const user = await this.prisma.user.findUnique({
      where: {
        email,
      },
      select: {
        id: true,
        name: true,
        email: true,
      },
    });

    if (!user) return { ok: false, error: 'user_not_found' };

    const existing = await this.getProjectMembership(user.id, projectId);
    if (existing) {
      return {
        ok: true,
        member: {
          id: existing.id,
          role: existing.role,
          user,
        },
        created: false,
      };
    }

    const createdMembership = await this.prisma.projectMembership.create({
      data: {
        userId: user.id,
        projectId,
        role: nextRole,
      },
      select: {
        id: true,
        role: true,
        createdAt: true,
        lastAccessedAt: true,
      },
    });

    return {
      ok: true,
      member: {
        ...createdMembership,
        user,
      },
      created: true,
    };
  }

  @Patch('projects/:id/members/:memberId')
  async updateProjectMember(
    @Headers('authorization') authorization: string | undefined,
    @Param('id') projectId: string,
    @Param('memberId') memberId: string,
    @Body() body: { role?: string },
  ) {
    const context = await this.getSessionContext(authorization);
    if (!context) return { ok: false, error: 'unauthorized' };
    if (context.isDemo) {
      return { ok: false, error: 'demo_access_read_only' };
    }

    const membership = await this.getProjectMembership(
      context.session.userId,
      projectId,
    );
    if (!membership) return { ok: false, error: 'project_not_found' };
    if (membership.role !== 'owner') {
      return { ok: false, error: 'forbidden' };
    }

    const nextRole = normalizeWorkspaceRole(body?.role);
    if (!nextRole) return { ok: false, error: 'invalid_role' };

    const targetMembership = await this.getManageableProjectMember(
      projectId,
      memberId,
    );
    if (!targetMembership) return { ok: false, error: 'member_not_found' };
    if (!MANAGEABLE_WORKSPACE_ROLES.has(targetMembership.role.toLowerCase())) {
      return { ok: false, error: 'managed_role_not_supported' };
    }

    if (targetMembership.role === 'owner' && nextRole !== 'owner') {
      const ownerCount = await this.countProjectOwners(projectId);
      if (ownerCount <= 1) {
        return { ok: false, error: 'last_owner_must_remain' };
      }
    }

    if (targetMembership.role === nextRole) {
      return {
        ok: true,
        member: {
          id: targetMembership.id,
          role: targetMembership.role,
          createdAt: targetMembership.createdAt,
          lastAccessedAt: targetMembership.lastAccessedAt,
          user: targetMembership.user,
        },
      };
    }

    const updatedMembership = await this.prisma.projectMembership.update({
      where: {
        id: memberId,
      },
      data: {
        role: nextRole,
      },
      select: {
        id: true,
        role: true,
        createdAt: true,
        lastAccessedAt: true,
      },
    });

    return {
      ok: true,
      member: {
        ...updatedMembership,
        user: targetMembership.user,
      },
    };
  }

  @Delete('projects/:id/members/:memberId')
  async removeProjectMember(
    @Headers('authorization') authorization: string | undefined,
    @Param('id') projectId: string,
    @Param('memberId') memberId: string,
  ) {
    const context = await this.getSessionContext(authorization);
    if (!context) return { ok: false, error: 'unauthorized' };
    if (context.isDemo) {
      return { ok: false, error: 'demo_access_read_only' };
    }

    const membership = await this.getProjectMembership(
      context.session.userId,
      projectId,
    );
    if (!membership) return { ok: false, error: 'project_not_found' };
    if (membership.role !== 'owner') {
      return { ok: false, error: 'forbidden' };
    }

    const targetMembership = await this.getManageableProjectMember(
      projectId,
      memberId,
    );
    if (!targetMembership) return { ok: false, error: 'member_not_found' };
    if (!MANAGEABLE_WORKSPACE_ROLES.has(targetMembership.role.toLowerCase())) {
      return { ok: false, error: 'managed_role_not_supported' };
    }

    if (targetMembership.role === 'owner') {
      const ownerCount = await this.countProjectOwners(projectId);
      if (ownerCount <= 1) {
        return { ok: false, error: 'last_owner_must_remain' };
      }
    }

    await this.prisma.projectMembership.delete({
      where: {
        id: memberId,
      },
    });

    return {
      ok: true,
      removedMemberId: memberId,
    };
  }
}
