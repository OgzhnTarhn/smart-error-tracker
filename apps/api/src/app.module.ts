import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { EventsController } from './events/events.controller';
import { AdminController } from './admin/admin.controller';
import { PrismaModule } from './prisma/prisma.module';
import { IngestRateLimitGuard } from './common/guards/ingest-rate-limit.guard';

@Module({
  imports: [PrismaModule],
  controllers: [AppController, EventsController, AdminController],
  providers: [AppService, IngestRateLimitGuard],
})
export class AppModule {}
