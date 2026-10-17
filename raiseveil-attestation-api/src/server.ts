import restify from 'restify';
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
): restify.Server {
  if (sharedSecret.length < 32) {
    throw new Error('The attestation shared secret must contain at least 32 characters');
  }
  const server = restify.createServer({ name: 'raiseveil-attestation-api' });
  server.use(restify.plugins.bodyParser());

  const providerPk: JubjubPoint = getPublicKey(providerSk);

  server.post('/attest', async (req: restify.Request, res: restify.Response, next: restify.Next) => {
    const authorization = req.headers.authorization ?? '';
    const expectedAuthorization = `Bearer ${sharedSecret}`;
    const provided = Buffer.from(authorization);
    const expected = Buffer.from(expectedAuthorization);
    if (provided.length !== expected.length || !timingSafeEqual(provided, expected)) {
      res.send(401, { error: 'Unauthorized' });
      return next();
    }

    if (!isRecord(req.body)) {
      res.send(400, { error: 'Expected a JSON body with token and userPubKeyHash' });
      return next();
    }

    const body = req.body as Partial<AttestationRequest>;
    if (typeof body.token !== 'string' || body.token.trim().length === 0 ||
        typeof body.userPubKeyHash !== 'string' || !/^\d+$/.test(body.userPubKeyHash)) {
      res.send(400, { error: 'Required fields: non-empty token and decimal userPubKeyHash' });
      return next();
    }

    let data: TraderData;
    try {
      data = await traderData(body.token);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown OANDA error';
      res.send(502, { error: `Unable to retrieve OANDA trader data: ${message}` });
      return next();
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

      res.send(200, response);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown signing error';
      res.send(500, { error: `Unable to create attestation: ${message}` });
    }
    return next();
  });

  server.get('/provider-info', (_req: restify.Request, res: restify.Response, next: restify.Next) => {
    const response: ProviderInfoResponse = {
      providerId,
      publicKey: {
        x: providerPk.x.toString(),
        y: providerPk.y.toString(),
      },
    };
    res.send(200, response);
    return next();
  });

  server.get('/health', (_req: restify.Request, res: restify.Response, next: restify.Next) => {
    const response: HealthResponse = {
      status: 'ok',
      providerId,
    };
    res.send(200, response);
    return next();
  });

  return server;
}