import { Body, Controller, Get, Headers, Param, Post } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { createHash, randomBytes } from 'crypto';

function sha256(input: string) {
  return createHash('sha256').update(input).digest('hex');
}

@Controller('admin')
export class AdminController {
  constructor(private readonly prisma: PrismaService) {}

  private checkAdminToken(token: string | undefined): boolean {
    if (process.env.NODE_ENV === 'production') return false; // Dev/Local only
    if (!process.env.ADMIN_TOKEN) return false;
    return token === process.env.ADMIN_TOKEN;
  }

  // 1) List Projects (with api key count)
  @Get('projects')
  async listProjects(@Headers('x-admin-token') adminToken: string) {
    if (!this.checkAdminToken(adminToken)) return { error: 'unauthorized' };

    const projects = await this.prisma.project.findMany({
      take: 50,
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: { apiKeys: true },
        },
      },
    });

    return {
      ok: true,
      projects: projects.map((p) => ({
        id: p.id,
        name: p.name,
        key: p.key,
        createdAt: p.createdAt,
        apiKeyCount: p._count.apiKeys,
      })),
    };
  }

  // 2) Create API Key for Project
  @Post('projects/:id/keys')
  async createApiKey(
    @Headers('x-admin-token') adminToken: string,
    @Param('id') projectId: string,
    @Body() body: { label?: string },
  ) {
    if (!this.checkAdminToken(adminToken)) return { error: 'unauthorized' };

    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
    });
    if (!project) return { error: 'project_not_found' };

    const rawApiKey = 'set_' + randomBytes(24).toString('hex');
    const keyHash = sha256(rawApiKey);

    const apiKey = await this.prisma.apiKey.create({
      data: {
        projectId,
        keyHash,
        label: body?.label || 'Generated Key',
      },
    });

    return {
      ok: true,
      apiKey: rawApiKey, // Sadece 1 kez gösteriyoruz! DB'de yok.
      keyId: apiKey.id,
    };
  }

  // 3) List API Keys for Project
  @Get('projects/:id/keys')
  async listApiKeys(
    @Headers('x-admin-token') adminToken: string,
    @Param('id') projectId: string,
  ) {
    if (!this.checkAdminToken(adminToken)) return { error: 'unauthorized' };

    const keys = await this.prisma.apiKey.findMany({
      where: { projectId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        label: true,
        createdAt: true,
        revokedAt: true,
      },
    });

    return { ok: true, keys };
  }

  // 4) Revoke API Key
  @Post('keys/:id/revoke')
  async revokeApiKey(
    @Headers('x-admin-token') adminToken: string,
    @Param('id') keyId: string,
  ) {
    if (!this.checkAdminToken(adminToken)) return { error: 'unauthorized' };

    const key = await this.prisma.apiKey.findUnique({ where: { id: keyId } });
    if (!key) return { error: 'key_not_found' };

    if (!key.revokedAt) {
      await this.prisma.apiKey.update({
        where: { id: keyId },
        data: { revokedAt: new Date() },
      });
    }

    return { ok: true, message: 'Key revoked' };
  }

  // 5) Create Project + Initial API Key (Mevcut endpoint'i koruyoruz)
  @Post('projects')
  async createProject(
    @Headers('x-admin-token') adminToken: string,
    @Body() body: { name: string; label?: string },
  ) {
    if (!this.checkAdminToken(adminToken)) return { error: 'unauthorized' };

    const name = (body?.name ?? '').trim();
    if (!name) return { error: 'missing_name' };

    const projectKey = 'proj_' + randomBytes(16).toString('hex');
    const rawApiKey = 'set_' + randomBytes(24).toString('hex');
    const keyHash = sha256(rawApiKey);

    const project = await this.prisma.project.create({
      data: { name, key: projectKey },
    });

    await this.prisma.apiKey.create({
      data: {
        projectId: project.id,
        keyHash,
        label: body.label ?? 'default',
      },
    });

    return {
      ok: true,
      project: { id: project.id, name: project.name, key: project.key },
      apiKey: rawApiKey,
    };
  }
}
