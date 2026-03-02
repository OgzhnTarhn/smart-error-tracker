import { EventsController } from './events.controller';
import { IngestEventDto } from './dto/ingest-event.dto';

describe('EventsController', () => {
  const tx = {
    errorGroup: { upsert: jest.fn() },
    event: { create: jest.fn() },
  };

  const prisma = {
    apiKey: { findUnique: jest.fn() },
    $transaction: jest.fn(),
  } as any;

  let controller: EventsController;

  beforeEach(() => {
    jest.clearAllMocks();
    controller = new EventsController(prisma);
  });

  it('uses a transaction and writes both group and event for ingest', async () => {
    prisma.apiKey.findUnique.mockResolvedValue({
      projectId: 'proj_1',
      revokedAt: null,
    });
    tx.errorGroup.upsert.mockResolvedValue({ id: 'group_1' });
    tx.event.create.mockResolvedValue({ id: 'event_1' });
    prisma.$transaction.mockImplementation(async (fn: any) => fn(tx));

    const body: IngestEventDto = {
      source: 'backend-service',
      message: 'Boom failure',
      context: { route: '/checkout' },
      level: 'error',
    };

    const result = await controller.ingest('set_valid_key', body);

    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(tx.errorGroup.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          projectId_fingerprint: {
            projectId: 'proj_1',
            fingerprint: expect.any(String),
          },
        },
        create: expect.objectContaining({
          projectId: 'proj_1',
          title: 'Boom failure',
          eventCount: 1,
        }),
      }),
    );
    expect(tx.event.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          projectId: 'proj_1',
          groupId: 'group_1',
          source: 'backend-service',
          message: 'Boom failure',
          level: 'error',
        }),
      }),
    );
    expect(result).toEqual({ ok: true, groupId: 'group_1' });
  });

  it('returns invalid_or_missing_api_key when key is invalid', async () => {
    prisma.apiKey.findUnique.mockResolvedValue(null);

    const result = await controller.ingest('set_invalid_key', {
      source: 'frontend',
      message: 'Invalid key event',
    });

    expect(prisma.$transaction).not.toHaveBeenCalled();
    expect(result).toEqual({ error: 'invalid_or_missing_api_key' });
  });
});
