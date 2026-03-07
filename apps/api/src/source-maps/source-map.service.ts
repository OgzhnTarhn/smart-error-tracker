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

export type SourceMapFrameKind =
  | 'remote_asset'
  | 'source'
  | 'local_path'
  | 'unsupported_url'
  | 'unknown';

export type SourceMapResolutionStatus =
  | 'resolved'
  | 'not_needed'
  | 'no_stack'
  | 'unsupported_stack'
  | 'missing_source_map'
  | 'fetch_failed'
  | 'invalid_source_map'
  | 'unmapped_frame';

export interface SourceMapResolutionResult {
  status: SourceMapResolutionStatus;
  message: string;
  hint: string | null;
  sourceMap: SourceMapResolution | null;
  diagnostics: {
    frame: StackFrame | null;
    frameKind: SourceMapFrameKind;
    mapUrl: string | null;
    httpStatus: number | null;
  };
}

interface FetchRawMapResult {
  status: 'ok' | 'not_found' | 'fetch_failed' | 'invalid';
  rawMap: any | null;
  httpStatus: number | null;
}

const SOURCE_FILE_EXTENSIONS = new Set([
  '.ts',
  '.tsx',
  '.jsx',
  '.vue',
  '.svelte',
  '.astro',
  '.coffee',
]);
const JAVASCRIPT_ASSET_EXTENSIONS = new Set(['.js', '.mjs', '.cjs']);

function getFileExtension(pathname: string) {
  const match = pathname.toLowerCase().match(/(\.[a-z0-9]+)$/i);
  return match?.[1] ?? '';
}

function isLikelyLocalPath(file: string) {
  return (
    /^[a-z]:\\/i.test(file) ||
    file.startsWith('\\\\') ||
    file.startsWith('/') ||
    file.startsWith('file:///')
  );
}

function isLikelySourcePath(file: string) {
  const normalized = file.trim().toLowerCase();

  if (
    normalized.startsWith('webpack:///') ||
    normalized.startsWith('vite:///') ||
    normalized.includes('/src/') ||
    normalized.includes('\\src\\') ||
    normalized.includes('/@fs/')
  ) {
    return true;
  }

  const extension = getFileExtension(normalized.split('?')[0]?.split('#')[0] ?? '');
  return SOURCE_FILE_EXTENSIONS.has(extension);
}

@Injectable()
export class SourceMapService {
  private readonly logger = new Logger(SourceMapService.name);
  private readonly mapCache = new Map<string, FetchRawMapResult>();

  async resolveTopFrame(
    stack: string | null | undefined,
  ): Promise<SourceMapResolution | null> {
    return (await this.resolveTopFrameDetailed(stack)).sourceMap;
  }

  async resolveTopFrameDetailed(
    stack: string | null | undefined,
  ): Promise<SourceMapResolutionResult> {
    if (!stack?.trim()) {
      return this.buildResult({
        status: 'no_stack',
        message: 'No stack trace is available for this event.',
        hint: 'Source map resolution needs a stack frame to inspect.',
        frame: null,
        frameKind: 'unknown',
        mapUrl: null,
        httpStatus: null,
        sourceMap: null,
      });
    }

    const frame = this.parseTopFrame(stack);
    if (!frame) {
      return this.buildResult({
        status: 'unsupported_stack',
        message: 'Could not parse a usable stack frame from this event.',
        hint: 'The resolver currently expects stack lines in the form "at fn (url:line:column)".',
        frame: null,
        frameKind: 'unknown',
        mapUrl: null,
        httpStatus: null,
        sourceMap: null,
      });
    }

    const frameKind = this.classifyFrame(frame.file);

    if (frameKind === 'source') {
      return this.buildResult({
        status: 'not_needed',
        message:
          'This stack already points to source-level code, so source map resolution is probably not needed.',
        hint:
          'Dev stacks from Vite or webpack often already include original source paths.',
        frame,
        frameKind,
        mapUrl: null,
        httpStatus: null,
        sourceMap: null,
      });
    }

    const mapUrl = this.buildMapUrl(frame.file);
    if (!mapUrl || frameKind !== 'remote_asset') {
      return this.buildResult({
        status: 'unsupported_stack',
        message:
          'This stack frame is not an HTTP(S) JavaScript asset URL, so the current resolver cannot fetch a matching source map.',
        hint:
          'The current resolver only works for remote browser asset URLs such as https://host/assets/app.js.',
        frame,
        frameKind,
        mapUrl: null,
        httpStatus: null,
        sourceMap: null,
      });
    }

    const rawMapResult = await this.fetchRawMap(mapUrl);
    if (rawMapResult.status !== 'ok') {
      if (rawMapResult.status === 'not_found') {
        return this.buildResult({
          status: 'missing_source_map',
          message: `No source map artifact was found at ${mapUrl}.`,
          hint:
            'Check that the built asset publishes a matching .map file and that the API can reach it.',
          frame,
          frameKind,
          mapUrl,
          httpStatus: rawMapResult.httpStatus,
          sourceMap: null,
        });
      }

      if (rawMapResult.status === 'invalid') {
        return this.buildResult({
          status: 'invalid_source_map',
          message: `A file was fetched from ${mapUrl}, but it was not a valid source map.`,
          hint:
            'Ensure the URL serves a real JSON source map instead of HTML, an error page, or another asset.',
          frame,
          frameKind,
          mapUrl,
          httpStatus: rawMapResult.httpStatus,
          sourceMap: null,
        });
      }

      return this.buildResult({
        status: 'fetch_failed',
        message: `The API could not fetch the source map at ${mapUrl}.`,
        hint:
          'If the API runs in a different environment, browser localhost asset URLs may not be reachable from the API process.',
        frame,
        frameKind,
        mapUrl,
        httpStatus: rawMapResult.httpStatus,
        sourceMap: null,
      });
    }

    try {
      let original:
        | {
            source: string | null;
            line: number | null;
            column: number | null;
            name: string | null;
          }
        | undefined;

      await SourceMapConsumer.with(rawMapResult.rawMap, null, (consumer) => {
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

      if (!original || !original.source) {
        return this.buildResult({
          status: 'unmapped_frame',
          message:
            'A source map was found, but the frame did not map to an original source location.',
          hint:
            'This usually means the stack trace and the .map file came from different builds, or the frame is already source-level.',
          frame,
          frameKind,
          mapUrl,
          httpStatus: rawMapResult.httpStatus,
          sourceMap: null,
        });
      }

      return this.buildResult({
        status: 'resolved',
        message: 'Resolved the top frame to its original source location.',
        hint: 'Source map resolved. Re-run analysis for more precise guidance.',
        frame,
        frameKind,
        mapUrl,
        httpStatus: rawMapResult.httpStatus,
        sourceMap: {
          mapUrl,
          minified: frame,
          original: {
            source: original.source,
            line: original.line ?? null,
            column: original.column ?? null,
            name: original.name ?? null,
          },
        },
      });
    } catch (error) {
      return this.buildResult({
        status: 'unmapped_frame',
        message:
          'A source map was found, but the frame could not be resolved to an original source location.',
        hint:
          'This often points to frame normalization issues or a mismatch between the stack trace and the uploaded .map file.',
        frame,
        frameKind,
        mapUrl,
        httpStatus: rawMapResult.httpStatus,
        sourceMap: null,
        error,
      });
    }
  }

  private buildResult(input: {
    status: SourceMapResolutionStatus;
    message: string;
    hint: string | null;
    frame: StackFrame | null;
    frameKind: SourceMapFrameKind;
    mapUrl: string | null;
    httpStatus: number | null;
    sourceMap: SourceMapResolution | null;
    error?: unknown;
  }): SourceMapResolutionResult {
    const result: SourceMapResolutionResult = {
      status: input.status,
      message: input.message,
      hint: input.hint,
      sourceMap: input.sourceMap,
      diagnostics: {
        frame: input.frame,
        frameKind: input.frameKind,
        mapUrl: input.mapUrl,
        httpStatus: input.httpStatus,
      },
    };

    this.logResult(result, input.error);
    return result;
  }

  private logResult(
    result: SourceMapResolutionResult,
    error?: unknown,
  ) {
    const location = result.diagnostics.frame
      ? `${result.diagnostics.frame.file}:${result.diagnostics.frame.line}:${result.diagnostics.frame.column}`
      : 'no-frame';
    const mapUrl = result.diagnostics.mapUrl ?? 'n/a';
    const details = `status=${result.status} frameKind=${result.diagnostics.frameKind} location=${location} mapUrl=${mapUrl}`;

    if (result.status === 'resolved' || result.status === 'not_needed') {
      this.logger.log(`Source map check ${details}`);
      return;
    }

    const errorSuffix =
      error instanceof Error && error.message
        ? ` error=${error.message}`
        : '';
    this.logger.warn(`Source map check ${details}${errorSuffix}`);
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

  private classifyFrame(file: string): SourceMapFrameKind {
    if (isLikelySourcePath(file)) {
      return 'source';
    }

    if (isLikelyLocalPath(file)) {
      return 'local_path';
    }

    try {
      const parsed = new URL(file);
      if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
        if (parsed.protocol === 'vite:' || parsed.protocol === 'webpack:') {
          return 'source';
        }
        return 'unsupported_url';
      }

      const extension = getFileExtension(parsed.pathname);
      return JAVASCRIPT_ASSET_EXTENSIONS.has(extension)
        ? 'remote_asset'
        : isLikelySourcePath(parsed.pathname)
          ? 'source'
          : 'unknown';
    } catch {
      return 'unknown';
    }
  }

  private buildMapUrl(file: string): string | null {
    try {
      const parsed = new URL(file);
      if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
        return null;
      }

      const extension = getFileExtension(parsed.pathname);
      if (!JAVASCRIPT_ASSET_EXTENSIONS.has(extension)) {
        return null;
      }

      parsed.search = '';
      parsed.hash = '';
      return `${parsed.toString()}.map`;
    } catch {
      return null;
    }
  }

  private async fetchRawMap(mapUrl: string): Promise<FetchRawMapResult> {
    if (this.mapCache.has(mapUrl)) {
      return this.mapCache.get(mapUrl)!;
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 2500);

    try {
      const response = await fetch(mapUrl, { signal: controller.signal });
      if (!response.ok) {
        const result: FetchRawMapResult = {
          status: response.status === 404 ? 'not_found' : 'fetch_failed',
          rawMap: null,
          httpStatus: response.status,
        };
        this.mapCache.set(mapUrl, result);
        return result;
      }

      const rawMap = await response.json();
      if (
        !rawMap ||
        typeof rawMap !== 'object' ||
        typeof rawMap.version !== 'number' ||
        typeof rawMap.mappings !== 'string'
      ) {
        const result: FetchRawMapResult = {
          status: 'invalid',
          rawMap: null,
          httpStatus: response.status,
        };
        this.mapCache.set(mapUrl, result);
        return result;
      }

      const result: FetchRawMapResult = {
        status: 'ok',
        rawMap,
        httpStatus: response.status,
      };
      this.mapCache.set(mapUrl, result);
      return result;
    } catch {
      const result: FetchRawMapResult = {
        status: 'fetch_failed',
        rawMap: null,
        httpStatus: null,
      };
      this.mapCache.set(mapUrl, result);
      return result;
    } finally {
      clearTimeout(timeout);
    }
  }
}
