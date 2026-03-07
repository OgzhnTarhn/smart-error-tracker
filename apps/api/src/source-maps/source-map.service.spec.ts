import { SourceMapConsumer } from 'source-map';
import { SourceMapService } from './source-map.service';

describe('SourceMapService', () => {
  let service: SourceMapService;

  beforeEach(() => {
    jest.restoreAllMocks();
    service = new SourceMapService();
  });

  it('resolves the top stack frame when a matching sourcemap is available', async () => {
    jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ version: 3, mappings: 'AAAA' }),
    } as any);

    jest
      .spyOn(SourceMapConsumer as any, 'with')
      .mockImplementation(async (_map: any, _sourceRoot: any, callback: any) =>
        callback({
          originalPositionFor: () => ({
            source: 'src/App.tsx',
            line: 42,
            column: 10,
            name: 'handleClick',
          }),
        }),
      );

    const stack =
      'Error: Boom\n    at onClick (http://localhost:5180/assets/index-abc123.js:1:4500)';

    const result = await service.resolveTopFrameDetailed(stack);

    expect(result).toEqual({
      status: 'resolved',
      message: 'Resolved the top frame to its original source location.',
      hint: 'Source map resolved. Re-run analysis for more precise guidance.',
      sourceMap: {
        mapUrl: 'http://localhost:5180/assets/index-abc123.js.map',
        minified: {
          functionName: 'onClick',
          file: 'http://localhost:5180/assets/index-abc123.js',
          line: 1,
          column: 4500,
        },
        original: {
          source: 'src/App.tsx',
          line: 42,
          column: 10,
          name: 'handleClick',
        },
      },
      diagnostics: {
        frame: {
          functionName: 'onClick',
          file: 'http://localhost:5180/assets/index-abc123.js',
          line: 1,
          column: 4500,
        },
        frameKind: 'remote_asset',
        mapUrl: 'http://localhost:5180/assets/index-abc123.js.map',
        httpStatus: 200,
      },
    });
  });

  it('returns not_needed when the stack already points at source code', async () => {
    const stack =
      'Error: Boom\n    at onClick (http://localhost:5173/src/App.tsx?t=123:42:10)';

    const result = await service.resolveTopFrameDetailed(stack);

    expect(result).toEqual({
      status: 'not_needed',
      message:
        'This stack already points to source-level code, so source map resolution is probably not needed.',
      hint:
        'Dev stacks from Vite or webpack often already include original source paths.',
      sourceMap: null,
      diagnostics: {
        frame: {
          functionName: 'onClick',
          file: 'http://localhost:5173/src/App.tsx?t=123',
          line: 42,
          column: 10,
        },
        frameKind: 'source',
        mapUrl: null,
        httpStatus: null,
      },
    });
  });

  it('returns missing_source_map when no .map artifact is available', async () => {
    jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: false,
      status: 404,
    } as any);

    const stack =
      'Error: Boom\n    at onClick (https://cdn.example.com/assets/app-abc123.js:1:4500)';

    const result = await service.resolveTopFrameDetailed(stack);

    expect(result).toEqual({
      status: 'missing_source_map',
      message:
        'No source map artifact was found at https://cdn.example.com/assets/app-abc123.js.map.',
      hint:
        'Check that the built asset publishes a matching .map file and that the API can reach it.',
      sourceMap: null,
      diagnostics: {
        frame: {
          functionName: 'onClick',
          file: 'https://cdn.example.com/assets/app-abc123.js',
          line: 1,
          column: 4500,
        },
        frameKind: 'remote_asset',
        mapUrl: 'https://cdn.example.com/assets/app-abc123.js.map',
        httpStatus: 404,
      },
    });
  });

  it('returns unsupported_stack for local file system paths', async () => {
    const stack = 'Error: Boom\n    at Object.fn (C:\\app\\dist\\index.js:10:2)';

    const result = await service.resolveTopFrameDetailed(stack);

    expect(result).toEqual({
      status: 'unsupported_stack',
      message:
        'This stack frame is not an HTTP(S) JavaScript asset URL, so the current resolver cannot fetch a matching source map.',
      hint:
        'The current resolver only works for remote browser asset URLs such as https://host/assets/app.js.',
      sourceMap: null,
      diagnostics: {
        frame: {
          functionName: 'Object.fn',
          file: 'C:\\app\\dist\\index.js',
          line: 10,
          column: 2,
        },
        frameKind: 'local_path',
        mapUrl: null,
        httpStatus: null,
      },
    });
  });
});
