import { Hono } from 'hono';
import { bodyLimit } from 'hono/body-limit';
import { timingSafeEqual } from 'node:crypto';
import { getPublicKey, encodeTraderData, signTraderData } from './signing.js';
import { traderData } from './trader/trader-data.js';
import type {
  AttestationRequest,
  AttestationResponse,
  HealthResponse,
  ProviderInfoResponse,
  TraderData,
} from './types.js';
import type { JubjubPoint } from '@midnight-ntwrk/compact-runtime';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function createServer(
  providerSk: bigint,
  providerId: number,
  sharedSecret: string,
): Hono {
  if (sharedSecret.length < 32) {
    throw new Error('The attestation shared secret must contain at least 32 characters');
  }
  const app = new Hono();
  app.use('/attest', bodyLimit({ maxSize: 32 * 1024 }));

  const providerPk: JubjubPoint = getPublicKey(providerSk);

  app.post('/attest', async (c) => {
    const authorization = c.req.header('authorization') ?? '';
    const expectedAuthorization = `Bearer ${sharedSecret}`;
    const provided = Buffer.from(authorization);
    const expected = Buffer.from(expectedAuthorization);
    if (provided.length !== expected.length || !timingSafeEqual(provided, expected)) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    let requestBody: unknown;
    try {
      requestBody = await c.req.json();
    } catch {
      return c.json({ error: 'Expected a JSON body with token and userPubKeyHash' }, 400);
    }

    if (!isRecord(requestBody)) {
      return c.json({ error: 'Expected a JSON body with token and userPubKeyHash' }, 400);
    }

    const body = requestBody as Partial<AttestationRequest>;
    if (typeof body.token !== 'string' || body.token.trim().length === 0 ||
        typeof body.userPubKeyHash !== 'string' || !/^\d+$/.test(body.userPubKeyHash)) {
      return c.json({ error: 'Required fields: non-empty token and decimal userPubKeyHash' }, 400);
    }

    let data: TraderData;
    try {
      data = await traderData(body.token);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown OANDA error';
      return c.json({ error: `Unable to retrieve OANDA trader data: ${message}` }, 502);
    }

    try {
      const encoded = encodeTraderData(data);
      const signature = signTraderData(providerSk, data);
      const response: AttestationResponse = {
        signature: {
          announcement: {
            x: signature.announcement.x.toString(),
            y: signature.announcement.y.toString(),
          },
          response: signature.response.toString(),
        },
        message: {
          tradeCount: encoded.tradeCount.toString(),
          tradeVolume: encoded.tradeVolume.toString(),
          averageTradeSize: encoded.averageTradeSize.toString(),
          averageReturn: encoded.averageReturn.toString(),
          startDate: encoded.startDate.toString(),
          lastTradeDate: encoded.lastTradeDate.toString(),
        },
        stats: {
          tradeCount: data.tradeCount,
          tradeVolume: data.tradeVolume,
          averageTradeSize: data.averageTradeSize,
          averageReturn: data.averageReturn,
          startDate: data.startDate.toISOString(),
          lastTradeDate: data.lastTradeDate.toISOString(),
        },
        userPubKeyHash: body.userPubKeyHash,
      };

      return c.json(response);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown signing error';
      return c.json({ error: `Unable to create attestation: ${message}` }, 500);
    }
  });

  app.get('/provider-info', (c) => {
    const response: ProviderInfoResponse = {
      providerId,
      publicKey: {
        x: providerPk.x.toString(),
        y: providerPk.y.toString(),
      },
    };
    return c.json(response);
  });

  app.get('/health', (c) => {
    const response: HealthResponse = {
      status: 'ok',
      providerId,
    };
    return c.json(response);
  });

  app.notFound((c) => c.json({ error: 'Route not found' }, 404));

  return app;
}