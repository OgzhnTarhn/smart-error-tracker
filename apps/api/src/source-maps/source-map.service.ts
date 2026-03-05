import { Injectable, Logger } from '@nestjs/common';
import { SourceMapConsumer } from 'source-map';

interface StackFrame {
  functionName: string | null;
  file: string;
  line: number;
  column: number;
}

export interface SourceMapResolution {
  mapUrl: string;
  minified: StackFrame;
  original: {
    source: string;
    line: number | null;
    column: number | null;
    name: string | null;
  };
}

@Injectable()
export class SourceMapService {
  private readonly logger = new Logger(SourceMapService.name);
  private readonly mapCache = new Map<string, any | null>();

  async resolveTopFrame(
    stack: string | null | undefined,
  ): Promise<SourceMapResolution | null> {
    const frame = this.parseTopFrame(stack);
    if (!frame) return null;

    const mapUrl = this.buildMapUrl(frame.file);
    if (!mapUrl) return null;

    const rawMap = await this.fetchRawMap(mapUrl);
    if (!rawMap) return null;

    try {
      let original:
        | {
            source: string | null;
            line: number | null;
            column: number | null;
            name: string | null;
          }
        | undefined;

      await SourceMapConsumer.with(rawMap, null, (consumer) => {
        original = consumer.originalPositionFor({
          line: frame.line,
          column: frame.column,
        }) as {
          source: string | null;
          line: number | null;
          column: number | null;
          name: string | null;
        };
      });

      if (!original || !original.source) return null;

      return {
        mapUrl,
        minified: frame,
        original: {
          source: original.source,
          line: original.line ?? null,
          column: original.column ?? null,
          name: original.name ?? null,
        },
      };
    } catch (err) {
      this.logger.debug(
        `Failed to resolve source map for ${frame.file}:${frame.line}:${frame.column}`,
      );
      return null;
    }
  }

  private parseTopFrame(stack: string | null | undefined): StackFrame | null {
    if (!stack) return null;

    const lines = stack.split('\n').map((line) => line.trim()).filter(Boolean);
    for (const line of lines) {
      if (!line.startsWith('at ')) continue;
      const parsed = this.parseStackLine(line);
      if (parsed) return parsed;
    }
    return null;
  }

  private parseStackLine(line: string): StackFrame | null {
    const withFunction = /^at\s+(.+?)\s+\((.+):(\d+):(\d+)\)$/;
    const withoutFunction = /^at\s+(.+):(\d+):(\d+)$/;

    const withFunctionMatch = line.match(withFunction);
    if (withFunctionMatch) {
      return {
        functionName: withFunctionMatch[1] ?? null,
        file: withFunctionMatch[2],
        line: Number(withFunctionMatch[3]),
        column: Number(withFunctionMatch[4]),
      };
    }

    const withoutFunctionMatch = line.match(withoutFunction);
    if (!withoutFunctionMatch) return null;

    return {
      functionName: null,
      file: withoutFunctionMatch[1],
      line: Number(withoutFunctionMatch[2]),
      column: Number(withoutFunctionMatch[3]),
    };
  }

  private buildMapUrl(file: string): string | null {
    try {
      const parsed = new URL(file);
      if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
        return null;
      }

      parsed.search = '';
      parsed.hash = '';
      return `${parsed.toString()}.map`;
    } catch {
      return null;
    }
  }

  private async fetchRawMap(mapUrl: string): Promise<any | null> {
    if (this.mapCache.has(mapUrl)) {
      return this.mapCache.get(mapUrl) ?? null;
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 2500);

    try {
      const response = await fetch(mapUrl, { signal: controller.signal });
      if (!response.ok) {
        this.mapCache.set(mapUrl, null);
        return null;
      }

      const rawMap = await response.json();
      if (
        !rawMap ||
        typeof rawMap !== 'object' ||
        typeof rawMap.version !== 'number' ||
        typeof rawMap.mappings !== 'string'
      ) {
        this.mapCache.set(mapUrl, null);
        return null;
      }

      this.mapCache.set(mapUrl, rawMap);
      return rawMap;
    } catch {
      this.mapCache.set(mapUrl, null);
      return null;
    } finally {
      clearTimeout(timeout);
    }
  }
}
