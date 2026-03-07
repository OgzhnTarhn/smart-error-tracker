import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

const UNKNOWN_LABEL = 'unknown';
const TOP_ROUTES_LIMIT = 5;

export interface DashboardBreakdownItem {
  name: string;
  count: number;
}

export interface DashboardTotals {
  totalEvents: number;
  totalIssues: number;
  openIssues: number;
  resolvedIssues: number;
  ignoredIssues: number;
}

export interface DashboardTrendPoint {
  date: string;
  count: number;
}

export interface DashboardStatsCounts {
  totalGroups: number;
  open: number;
  resolved: number;
  ignored: number;
  totalEvents: number;
}

export interface DashboardTopIssue {
  id: string;
  title: string;
  status: string;
  isRegression: boolean;
  regressionCount: number;
  lastRegressedAt: Date | null;
  eventCount: number;
  lastSeenAt: Date;
}

export interface DashboardStatsResult {
  ok: true;
  totals: DashboardTotals;
  trend7d: DashboardTrendPoint[];
  errorsByLevel: DashboardBreakdownItem[];
  errorsByEnvironment: DashboardBreakdownItem[];
  errorsByRelease: DashboardBreakdownItem[];
  topRoutes: DashboardBreakdownItem[];
  topIssues: DashboardTopIssue[];
  counts: DashboardStatsCounts;
  dailyTrend: DashboardTrendPoint[];
}

type GroupableEventField = 'level' | 'environment' | 'releaseVersion';
type GroupByRow = {
  _count: { _all: number };
} & Partial<Record<GroupableEventField, string | null>>;
type GroupByQuery = {
  by: [GroupableEventField];
  where: { projectId: string };
  _count: { _all: true };
};

function asRecord(
  value: Prisma.JsonValue | Record<string, unknown> | null | undefined,
): Record<string, unknown> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }
  return value as Record<string, unknown>;
}

function asDisplayString(value: unknown): string | null {
  if (typeof value !== 'string' && typeof value !== 'number') {
    return null;
  }

  const trimmed = String(value).trim();
  return trimmed ? trimmed : null;
}

function normalizeLabel(value: string | null | undefined) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : UNKNOWN_LABEL;
}

function sortBreakdown(items: DashboardBreakdownItem[]) {
  return items.sort(
    (a, b) => b.count - a.count || a.name.localeCompare(b.name),
  );
}

function isFrontendSource(source: string | null | undefined) {
  const normalized = source?.trim().toLowerCase();
  if (!normalized) return false;

  return (
    normalized === 'frontend' ||
    normalized === 'browser' ||
    normalized.includes('front') ||
    normalized.includes('browser')
  );
}

@Injectable()
export class DashboardStatsService {
  constructor(private readonly prisma: PrismaService) {}

  async getStats(
    projectId: string,
    now: Date = new Date(),
  ): Promise<DashboardStatsResult> {
    const [
      totalIssues,
      openIssues,
      resolvedIssues,
      ignoredIssues,
      totalEvents,
      trendEvents,
      errorsByLevel,
      errorsByEnvironment,
      errorsByRelease,
      topRoutes,
      topIssues,
    ] = await Promise.all([
      this.prisma.errorGroup.count({ where: { projectId } }),
      this.prisma.errorGroup.count({
        where: { projectId, status: 'open' },
      }),
      this.prisma.errorGroup.count({
        where: { projectId, status: 'resolved' },
      }),
      this.prisma.errorGroup.count({
        where: { projectId, status: 'ignored' },
      }),
      this.prisma.event.count({ where: { projectId } }),
      this.prisma.event.findMany({
        where: { projectId, timestamp: { gte: this.getTrendStart(now) } },
        select: { timestamp: true },
        orderBy: { timestamp: 'asc' },
      }),
      this.getLevelBreakdown(projectId),
      this.getEnvironmentBreakdown(projectId),
      this.getReleaseBreakdown(projectId),
      this.getTopRoutes(projectId),
      this.prisma.errorGroup.findMany({
        where: { projectId },
        take: 5,
        orderBy: { eventCount: 'desc' },
        select: {
          id: true,
          title: true,
          status: true,
          isRegression: true,
          regressionCount: true,
          lastRegressedAt: true,
          eventCount: true,
          lastSeenAt: true,
        },
      }),
    ]);

    const totals: DashboardTotals = {
      totalEvents,
      totalIssues,
      openIssues,
      resolvedIssues,
      ignoredIssues,
    };
    const trend7d = this.buildTrend7d(trendEvents, now);
    const counts: DashboardStatsCounts = {
      totalGroups: totalIssues,
      open: openIssues,
      resolved: resolvedIssues,
      ignored: ignoredIssues,
      totalEvents,
    };

    return {
      ok: true,
      totals,
      trend7d,
      errorsByLevel,
      errorsByEnvironment,
      errorsByRelease,
      topRoutes,
      topIssues,
      counts,
      dailyTrend: trend7d,
    };
  }

  private getTrendStart(now: Date) {
    const start = this.startOfUtcDay(now);
    start.setUTCDate(start.getUTCDate() - 6);
    return start;
  }

  private startOfUtcDay(value: Date) {
    return new Date(
      Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate()),
    );
  }

  private buildTrend7d(
    events: Array<{ timestamp: Date }>,
    now: Date,
  ): DashboardTrendPoint[] {
    const buckets = new Map<string, number>();
    const start = this.getTrendStart(now);

    for (let day = 0; day < 7; day += 1) {
      const date = new Date(start);
      date.setUTCDate(start.getUTCDate() + day);
      buckets.set(date.toISOString().slice(0, 10), 0);
    }

    for (const event of events) {
      const dateKey = new Date(event.timestamp).toISOString().slice(0, 10);
      if (buckets.has(dateKey)) {
        buckets.set(dateKey, (buckets.get(dateKey) ?? 0) + 1);
      }
    }

    return Array.from(buckets.entries()).map(([date, count]) => ({
      date,
      count,
    }));
  }

  private async getLevelBreakdown(projectId: string) {
    const rows = await this.groupEventRows({
      by: ['level'],
      where: { projectId },
      _count: { _all: true },
    });

    return this.mergeBreakdownRows(rows, 'level');
  }

  private async getEnvironmentBreakdown(projectId: string) {
    const rows = await this.groupEventRows({
      by: ['environment'],
      where: { projectId },
      _count: { _all: true },
    });

    return this.mergeBreakdownRows(rows, 'environment');
  }

  private async getReleaseBreakdown(projectId: string) {
    const rows = await this.groupEventRows({
      by: ['releaseVersion'],
      where: { projectId },
      _count: { _all: true },
    });

    return this.mergeBreakdownRows(rows, 'releaseVersion');
  }

  private groupEventRows(query: GroupByQuery): Promise<GroupByRow[]> {
    const groupBy = this.prisma.event.groupBy as unknown as (
      args: GroupByQuery,
    ) => Promise<GroupByRow[]>;

    return groupBy(query);
  }

  private mergeBreakdownRows(
    rows: GroupByRow[],
    field: GroupableEventField,
  ): DashboardBreakdownItem[] {
    const counts = new Map<string, number>();

    for (const row of rows) {
      const name = normalizeLabel(row[field] ?? null);
      counts.set(name, (counts.get(name) ?? 0) + row._count._all);
    }

    return sortBreakdown(
      Array.from(counts.entries()).map(([name, count]) => ({
        name,
        count,
      })),
    );
  }

  private async getTopRoutes(
    projectId: string,
  ): Promise<DashboardBreakdownItem[]> {
    const events = await this.prisma.event.findMany({
      where: {
        projectId,
        NOT: { level: 'info' },
      },
      select: {
        source: true,
        context: true,
        level: true,
      },
    });

    const counts = new Map<string, number>();
    for (const event of events) {
      const routeName = this.extractRouteName(event.source, event.context);
      counts.set(routeName, (counts.get(routeName) ?? 0) + 1);
    }

    return sortBreakdown(
      Array.from(counts.entries()).map(([name, count]) => ({
        name,
        count,
      })),
    ).slice(0, TOP_ROUTES_LIMIT);
  }

  private extractRouteName(
    source: string,
    context: Prisma.JsonValue | null,
  ): string {
    const contextRecord = asRecord(context);
    const preferredKeys = isFrontendSource(source)
      ? ['route', 'path', 'url']
      : ['endpoint', 'path', 'route', 'url'];

    for (const key of preferredKeys) {
      const value = contextRecord?.[key];
      if (key === 'url') {
        const urlPath = this.extractPathFromUrl(value);
        if (urlPath) return urlPath;
        continue;
      }

      const label = asDisplayString(value);
      if (label) return label;
    }

    return UNKNOWN_LABEL;
  }

  private extractPathFromUrl(value: unknown): string | null {
    const label = asDisplayString(value);
    if (!label) return null;

    try {
      const parsedUrl = new URL(label, 'http://local.smart-error-tracker');
      const pathname = parsedUrl.pathname.trim();
      return pathname || '/';
    } catch {
      const pathname = label.split(/[?#]/, 1)[0]?.trim();
      return pathname || null;
    }
  }
}
