import { Body, Controller, Headers, Post } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { createHash, randomBytes } from 'crypto';

function sha256(input: string) {
  return createHash('sha256').update(input).digest('hex');
}

@Controller('admin')
export class AdminController {
  constructor(private readonly prisma: PrismaService) { }

  // Project + API key üretir (dev için)
  @Post('projects')
  async createProject(
    @Headers('x-admin-token') adminToken: string,
    @Body() body: { name: string; label?: string }
  ) {
    if (!adminToken || adminToken !== process.env.ADMIN_TOKEN) {
      return { error: 'unauthorized_admin' };
    }

    const name = (body?.name ?? '').trim();
    if (!name) return { error: 'missing_name' };

    const projectKey = 'proj_' + randomBytes(16).toString('hex'); // public key
    const rawApiKey = 'set_' + randomBytes(24).toString('hex');   // secret key (1 kez gösterilir)
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
