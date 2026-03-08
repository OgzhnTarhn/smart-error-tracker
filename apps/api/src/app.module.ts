import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { EventsController } from './events/events.controller';
import { AdminController } from './admin/admin.controller';
import { PrismaModule } from './prisma/prisma.module';
import { IngestRateLimitGuard } from './common/guards/ingest-rate-limit.guard';
import { SourceMapService } from './source-maps/source-map.service';
import { DashboardStatsService } from './dashboard/dashboard-stats.service';
import { SimilarIssuesService } from './events/similar-issues.service';

@Module({
  imports: [PrismaModule],
  controllers: [AppController, EventsController, AdminController],
  providers: [
    AppService,
    IngestRateLimitGuard,
    SourceMapService,
    DashboardStatsService,
    SimilarIssuesService,
  ],
})
export class AppModule {}
