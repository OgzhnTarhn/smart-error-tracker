import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import { createHash, randomBytes } from 'crypto';

function sha256(input: string) {
  return createHash('sha256').update(input).digest('hex');
}

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL missing in apps/api/.env');
  }

  const pool = new Pool({ connectionString });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });

  const projectName = process.argv[2] ?? 'demo';
  const label = process.argv[3] ?? 'default';

  const projectKey = 'proj_' + randomBytes(16).toString('hex');
  const rawApiKey = 'set_' + randomBytes(24).toString('hex');
  const keyHash = sha256(rawApiKey);

  const project = await prisma.project.create({
    data: { name: projectName, key: projectKey },
  });

  await prisma.apiKey.create({
    data: { projectId: project.id, keyHash, label },
  });

  console.log('OK');
  console.log('Project:', { id: project.id, name: project.name, key: project.key });
  console.log('API Key (SAVE THIS):', rawApiKey);

  await prisma.$disconnect();
  await pool.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});