import { WorkspaceController } from './workspace.controller';

describe('WorkspaceController', () => {
  const prisma = {
    $transaction: jest.fn(),
    projectMembership: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      count: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    project: {
      create: jest.fn(),
    },
    apiKey: {
      create: jest.fn(),
      findMany: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
    },
  } as any;

  const authService = {
    getSessionFromToken: jest.fn(),
    isDemoUserEmail: jest.fn(),
  } as any;

  let controller: WorkspaceController;

  beforeEach(() => {
    jest.clearAllMocks();
    controller = new WorkspaceController(prisma, authService);
  });

  it('lists projects for the authenticated workspace user', async () => {
    authService.getSessionFromToken.mockResolvedValue({
      userId: 'user_1',
      user: {
        email: 'oguzhan@example.com',
      },
    });
    authService.isDemoUserEmail.mockReturnValue(false);
    prisma.projectMembership.findMany.mockResolvedValue([
      {
        role: 'owner',
        lastAccessedAt: new Date('2026-03-24T10:00:00.000Z'),
        project: {
          id: 'project_1',
          name: 'checkout-web',
          key: 'proj_checkout_web',
          createdAt: new Date('2026-03-20T09:00:00.000Z'),
          _count: {
            apiKeys: 2,
          },
        },
      },
    ]);

    const result = await controller.listProjects('Bearer sess_token');

    expect(prisma.projectMembership.findMany).toHaveBeenCalledWith({
      where: {
        userId: 'user_1',
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
    expect(result).toEqual({
      ok: true,
      projects: [
        {
          id: 'project_1',
          name: 'checkout-web',
          key: 'proj_checkout_web',
          createdAt: new Date('2026-03-20T09:00:00.000Z'),
          apiKeyCount: 2,
          role: 'owner',
          lastAccessedAt: new Date('2026-03-24T10:00:00.000Z'),
        },
      ],
    });
  });

  it('creates a project, initial api key, and owner membership for member sessions', async () => {
    authService.getSessionFromToken.mockResolvedValue({
      userId: 'user_1',
      user: {
        email: 'oguzhan@example.com',
      },
    });
    authService.isDemoUserEmail.mockReturnValue(false);
    prisma.$transaction.mockImplementation(async (fn: any) =>
      fn({
        project: {
          create: jest.fn().mockResolvedValue({
            id: 'project_1',
            name: 'checkout-web',
            key: 'proj_generated',
          }),
        },
        apiKey: {
          create: jest.fn().mockResolvedValue({
            id: 'key_1',
          }),
        },
        projectMembership: {
          create: jest.fn().mockResolvedValue({
            id: 'membership_1',
          }),
        },
      }),
    );

    const result = await controller.createProject('Bearer sess_token', {
      name: ' checkout-web ',
      label: 'frontend',
    });

    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(result).toEqual({
      ok: true,
      project: {
        id: 'project_1',
        name: 'checkout-web',
        key: 'proj_generated',
      },
      apiKey: expect.stringMatching(/^set_/),
    });
  });

  it('rejects project creation for demo sessions', async () => {
    authService.getSessionFromToken.mockResolvedValue({
      userId: 'user_demo',
      user: {
        email: 'demo@smarterror.dev',
      },
    });
    authService.isDemoUserEmail.mockReturnValue(true);

    const result = await controller.createProject('Bearer sess_token', {
      name: 'demo-project',
    });

    expect(result).toEqual({
      ok: false,
      error: 'demo_access_read_only',
    });
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('lists api key metadata for an accessible project', async () => {
    authService.getSessionFromToken.mockResolvedValue({
      userId: 'user_1',
      user: {
        email: 'oguzhan@example.com',
      },
    });
    authService.isDemoUserEmail.mockReturnValue(false);
    prisma.projectMembership.findUnique.mockResolvedValue({
      id: 'membership_1',
    });
    prisma.apiKey.findMany.mockResolvedValue([
      {
        id: 'key_1',
        label: 'frontend',
        createdAt: new Date('2026-03-24T12:00:00.000Z'),
        revokedAt: null,
      },
    ]);

    const result = await controller.listProjectApiKeys(
      'Bearer sess_token',
      'project_1',
    );

    expect(result).toEqual({
      ok: true,
      keys: [
        {
          id: 'key_1',
          label: 'frontend',
          createdAt: new Date('2026-03-24T12:00:00.000Z'),
          revokedAt: null,
        },
      ],
    });
  });

  it('creates a new project api key for accessible member sessions', async () => {
    authService.getSessionFromToken.mockResolvedValue({
      userId: 'user_1',
      user: {
        email: 'oguzhan@example.com',
      },
    });
    authService.isDemoUserEmail.mockReturnValue(false);
    prisma.projectMembership.findUnique.mockResolvedValue({
      id: 'membership_1',
    });
    prisma.apiKey.create.mockResolvedValue({
      id: 'key_2',
    });

    const result = await controller.createProjectApiKey(
      'Bearer sess_token',
      'project_1',
      {
        label: 'production',
      },
    );

    expect(prisma.apiKey.create).toHaveBeenCalledWith({
      data: {
        projectId: 'project_1',
        keyHash: expect.any(String),
        label: 'production',
      },
    });
    expect(result).toEqual({
      ok: true,
      apiKey: expect.stringMatching(/^set_/),
      keyId: 'key_2',
    });
  });

  it('lists project members for accessible sessions', async () => {
    authService.getSessionFromToken.mockResolvedValue({
      userId: 'user_1',
      user: {
        email: 'oguzhan@example.com',
      },
    });
    authService.isDemoUserEmail.mockReturnValue(false);
    prisma.projectMembership.findUnique.mockResolvedValue({
      id: 'membership_owner',
      role: 'owner',
    });
    prisma.projectMembership.findMany.mockResolvedValue([
      {
        id: 'membership_owner',
        role: 'owner',
        createdAt: new Date('2026-03-20T10:00:00.000Z'),
        lastAccessedAt: new Date('2026-03-24T12:00:00.000Z'),
        user: {
          id: 'user_1',
          name: 'Oguzhan Yilmaz',
          email: 'oguzhan@example.com',
        },
      },
      {
        id: 'membership_member',
        role: 'member',
        createdAt: new Date('2026-03-21T10:00:00.000Z'),
        lastAccessedAt: null,
        user: {
          id: 'user_2',
          name: 'Ada Lovelace',
          email: 'ada@example.com',
        },
      },
    ]);

    const result = await controller.listProjectMembers(
      'Bearer sess_token',
      'project_1',
    );

    expect(result).toEqual({
      ok: true,
      members: [
        {
          id: 'membership_owner',
          role: 'owner',
          createdAt: new Date('2026-03-20T10:00:00.000Z'),
          lastAccessedAt: new Date('2026-03-24T12:00:00.000Z'),
          user: {
            id: 'user_1',
            name: 'Oguzhan Yilmaz',
            email: 'oguzhan@example.com',
          },
        },
        {
          id: 'membership_member',
          role: 'member',
          createdAt: new Date('2026-03-21T10:00:00.000Z'),
          lastAccessedAt: null,
          user: {
            id: 'user_2',
            name: 'Ada Lovelace',
            email: 'ada@example.com',
          },
        },
      ],
    });
  });

  it('adds an existing user to a project for owner sessions', async () => {
    authService.getSessionFromToken.mockResolvedValue({
      userId: 'user_1',
      user: {
        email: 'oguzhan@example.com',
      },
    });
    authService.isDemoUserEmail.mockReturnValue(false);
    prisma.projectMembership.findUnique
      .mockResolvedValueOnce({
        id: 'membership_owner',
        role: 'owner',
      })
      .mockResolvedValueOnce(null);
    prisma.user.findUnique.mockResolvedValue({
      id: 'user_2',
      name: 'Ada Lovelace',
      email: 'ada@example.com',
    });
    prisma.projectMembership.create.mockResolvedValue({
      id: 'membership_member',
      role: 'member',
      createdAt: new Date('2026-03-24T13:00:00.000Z'),
      lastAccessedAt: null,
    });

    const result = await controller.addProjectMember(
      'Bearer sess_token',
      'project_1',
      {
        email: ' Ada@example.com ',
      },
    );

    expect(prisma.user.findUnique).toHaveBeenCalledWith({
      where: {
        email: 'ada@example.com',
      },
      select: {
        id: true,
        name: true,
        email: true,
      },
    });
    expect(prisma.projectMembership.create).toHaveBeenCalledWith({
      data: {
        userId: 'user_2',
        projectId: 'project_1',
        role: 'member',
      },
      select: {
        id: true,
        role: true,
        createdAt: true,
        lastAccessedAt: true,
      },
    });
    expect(result).toEqual({
      ok: true,
      member: {
        id: 'membership_member',
        role: 'member',
        createdAt: new Date('2026-03-24T13:00:00.000Z'),
        lastAccessedAt: null,
        user: {
          id: 'user_2',
          name: 'Ada Lovelace',
          email: 'ada@example.com',
        },
      },
      created: true,
    });
  });

  it('updates a project member role for owner sessions', async () => {
    authService.getSessionFromToken.mockResolvedValue({
      userId: 'user_1',
      user: {
        email: 'oguzhan@example.com',
      },
    });
    authService.isDemoUserEmail.mockReturnValue(false);
    prisma.projectMembership.findUnique.mockResolvedValue({
      id: 'membership_owner',
      role: 'owner',
    });
    prisma.projectMembership.findFirst.mockResolvedValue({
      id: 'membership_member',
      role: 'member',
      createdAt: new Date('2026-03-21T10:00:00.000Z'),
      lastAccessedAt: null,
      user: {
        id: 'user_2',
        name: 'Ada Lovelace',
        email: 'ada@example.com',
      },
    });
    prisma.projectMembership.update.mockResolvedValue({
      id: 'membership_member',
      role: 'owner',
      createdAt: new Date('2026-03-21T10:00:00.000Z'),
      lastAccessedAt: null,
    });

    const result = await controller.updateProjectMember(
      'Bearer sess_token',
      'project_1',
      'membership_member',
      {
        role: ' owner ',
      },
    );

    expect(prisma.projectMembership.update).toHaveBeenCalledWith({
      where: {
        id: 'membership_member',
      },
      data: {
        role: 'owner',
      },
      select: {
        id: true,
        role: true,
        createdAt: true,
        lastAccessedAt: true,
      },
    });
    expect(result).toEqual({
      ok: true,
      member: {
        id: 'membership_member',
        role: 'owner',
        createdAt: new Date('2026-03-21T10:00:00.000Z'),
        lastAccessedAt: null,
        user: {
          id: 'user_2',
          name: 'Ada Lovelace',
          email: 'ada@example.com',
        },
      },
    });
  });

  it('prevents removing the last remaining project owner', async () => {
    authService.getSessionFromToken.mockResolvedValue({
      userId: 'user_1',
      user: {
        email: 'oguzhan@example.com',
      },
    });
    authService.isDemoUserEmail.mockReturnValue(false);
    prisma.projectMembership.findUnique.mockResolvedValue({
      id: 'membership_owner',
      role: 'owner',
    });
    prisma.projectMembership.findFirst.mockResolvedValue({
      id: 'membership_owner',
      role: 'owner',
      createdAt: new Date('2026-03-20T10:00:00.000Z'),
      lastAccessedAt: new Date('2026-03-24T12:00:00.000Z'),
      user: {
        id: 'user_1',
        name: 'Oguzhan Yilmaz',
        email: 'oguzhan@example.com',
      },
    });
    prisma.projectMembership.count.mockResolvedValue(1);

    const result = await controller.removeProjectMember(
      'Bearer sess_token',
      'project_1',
      'membership_owner',
    );

    expect(prisma.projectMembership.delete).not.toHaveBeenCalled();
    expect(result).toEqual({
      ok: false,
      error: 'last_owner_must_remain',
    });
  });

  it('removes a project member for owner sessions', async () => {
    authService.getSessionFromToken.mockResolvedValue({
      userId: 'user_1',
      user: {
        email: 'oguzhan@example.com',
      },
    });
    authService.isDemoUserEmail.mockReturnValue(false);
    prisma.projectMembership.findUnique.mockResolvedValue({
      id: 'membership_owner',
      role: 'owner',
    });
    prisma.projectMembership.findFirst.mockResolvedValue({
      id: 'membership_member',
      role: 'member',
      createdAt: new Date('2026-03-21T10:00:00.000Z'),
      lastAccessedAt: null,
      user: {
        id: 'user_2',
        name: 'Ada Lovelace',
        email: 'ada@example.com',
      },
    });

    const result = await controller.removeProjectMember(
      'Bearer sess_token',
      'project_1',
      'membership_member',
    );

    expect(prisma.projectMembership.delete).toHaveBeenCalledWith({
      where: {
        id: 'membership_member',
      },
    });
    expect(result).toEqual({
      ok: true,
      removedMemberId: 'membership_member',
    });
  });
});
