import { scryptSync } from 'crypto';
import { AuthService } from './auth.service';

function makePasswordHash(password: string) {
  const salt = 'smart-error-tracker-test-salt';
  const derived = scryptSync(password, salt, 64).toString('hex');
  return `scrypt:${salt}:${derived}`;
}

function makeSession(overrides: Record<string, unknown> = {}) {
  return {
    id: 'sess_1',
    userId: 'user_1',
    tokenHash: 'hash',
    createdAt: new Date('2026-03-24T09:00:00.000Z'),
    lastSeenAt: new Date('2026-03-24T10:00:00.000Z'),
    expiresAt: new Date('2026-03-31T10:00:00.000Z'),
    revokedAt: null,
    dashboardApiKeyId: 'api_key_1',
    user: {
      id: 'user_1',
      name: 'Oguzhan Yilmaz',
      email: 'oguzhan@example.com',
      passwordHash: makePasswordHash('current-password'),
      createdAt: new Date('2026-03-20T08:00:00.000Z'),
      updatedAt: new Date('2026-03-24T08:00:00.000Z'),
    },
    dashboardApiKey: {
      id: 'api_key_1',
      projectId: 'project_1',
      keyHash: 'api_key_hash',
      label: 'member-dashboard-session',
      createdAt: new Date('2026-03-24T09:00:00.000Z'),
      revokedAt: null,
      project: {
        id: 'project_1',
        name: 'checkout-web',
        key: 'proj_checkout_web',
        createdAt: new Date('2026-03-18T09:00:00.000Z'),
      },
    },
    ...overrides,
  };
}

describe('AuthService', () => {
  const oldDemoUserEmail = process.env.DEMO_USER_EMAIL;

  const prisma = {
    user: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  } as any;

  let service: AuthService;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.DEMO_USER_EMAIL = 'demo@smarterror.dev';
    service = new AuthService(prisma);
  });

  afterAll(() => {
    process.env.DEMO_USER_EMAIL = oldDemoUserEmail;
  });

  it('returns profile details for an authenticated member session', async () => {
    jest
      .spyOn(service, 'getSessionFromToken')
      .mockResolvedValue(makeSession() as any);

    const result = await service.getProfile('sess_token');

    expect(result).toEqual({
      ok: true,
      user: {
        id: 'user_1',
        name: 'Oguzhan Yilmaz',
        email: 'oguzhan@example.com',
      },
      mode: 'member',
      project: {
        id: 'project_1',
        name: 'checkout-web',
        key: 'proj_checkout_web',
      },
      dashboardApiKeyAvailable: true,
      currentSession: {
        createdAt: new Date('2026-03-24T09:00:00.000Z'),
        lastSeenAt: new Date('2026-03-24T10:00:00.000Z'),
        expiresAt: new Date('2026-03-31T10:00:00.000Z'),
      },
    });
  });

  it('updates member profile fields', async () => {
    jest
      .spyOn(service, 'getSessionFromToken')
      .mockResolvedValue(makeSession() as any);
    prisma.user.findUnique.mockResolvedValue(null);
    prisma.user.update.mockResolvedValue({
      id: 'user_1',
      name: 'Oguzhan Can Yilmaz',
      email: 'oguzhan.can@example.com',
      passwordHash: makePasswordHash('current-password'),
      createdAt: new Date('2026-03-20T08:00:00.000Z'),
      updatedAt: new Date('2026-03-24T11:00:00.000Z'),
    });

    const result = await service.updateProfile('sess_token', {
      name: '  Oguzhan Can Yilmaz  ',
      email: '  Oguzhan.Can@example.com  ',
    });

    expect(prisma.user.findUnique).toHaveBeenCalledWith({
      where: { email: 'oguzhan.can@example.com' },
    });
    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: 'user_1' },
      data: {
        name: 'Oguzhan Can Yilmaz',
        email: 'oguzhan.can@example.com',
      },
    });
    expect(result).toMatchObject({
      ok: true,
      user: {
        id: 'user_1',
        name: 'Oguzhan Can Yilmaz',
        email: 'oguzhan.can@example.com',
      },
      mode: 'member',
    });
  });

  it('rejects profile edits for the demo account', async () => {
    jest.spyOn(service, 'getSessionFromToken').mockResolvedValue(
      makeSession({
        user: {
          id: 'user_demo',
          name: 'Demo Analyst',
          email: 'demo@smarterror.dev',
          passwordHash: null,
          createdAt: new Date('2026-03-20T08:00:00.000Z'),
          updatedAt: new Date('2026-03-24T08:00:00.000Z'),
        },
      }) as any,
    );

    const result = await service.updateProfile('sess_token', {
      name: 'Another Demo Name',
      email: 'demo+updated@smarterror.dev',
    });

    expect(result).toEqual({
      ok: false,
      error: 'demo_account_locked',
    });
    expect(prisma.user.findUnique).not.toHaveBeenCalled();
    expect(prisma.user.update).not.toHaveBeenCalled();
  });

  it('changes password when the current password is valid', async () => {
    jest
      .spyOn(service, 'getSessionFromToken')
      .mockResolvedValue(makeSession() as any);
    prisma.user.update.mockResolvedValue({
      id: 'user_1',
    });

    const result = await service.changePassword('sess_token', {
      currentPassword: 'current-password',
      newPassword: 'new-password-123',
    });

    expect(result).toEqual({ ok: true });
    expect(prisma.user.update).toHaveBeenCalledTimes(1);
    expect(prisma.user.update.mock.calls[0][0].where).toEqual({ id: 'user_1' });
    expect(prisma.user.update.mock.calls[0][0].data.passwordHash).toEqual(
      expect.stringMatching(/^scrypt:/),
    );
    expect(prisma.user.update.mock.calls[0][0].data.passwordHash).not.toBe(
      makePasswordHash('current-password'),
    );
  });

  it('rejects password changes when the current password is wrong', async () => {
    jest
      .spyOn(service, 'getSessionFromToken')
      .mockResolvedValue(makeSession() as any);

    const result = await service.changePassword('sess_token', {
      currentPassword: 'wrong-password',
      newPassword: 'new-password-123',
    });

    expect(result).toEqual({
      ok: false,
      error: 'invalid_current_password',
    });
    expect(prisma.user.update).not.toHaveBeenCalled();
  });
});
