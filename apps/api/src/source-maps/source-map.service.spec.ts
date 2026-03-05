import { SourceMapConsumer } from 'source-map';
import { SourceMapService } from './source-map.service';

describe('SourceMapService', () => {
  let service: SourceMapService;

  beforeEach(() => {
    jest.restoreAllMocks();
    service = new SourceMapService();
  });

  it('resolves the top stack frame when sourcemap is available', async () => {
    jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
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

    const result = await service.resolveTopFrame(stack);

    expect(result).toEqual({
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
    });
  });

  it('returns null when stack frame is not an http/https URL', async () => {
    const stack = 'Error: Boom\n    at Object.fn (C:\\app\\dist\\index.js:10:2)';
    const result = await service.resolveTopFrame(stack);
    expect(result).toBeNull();
  });
});
