import { afterEach, describe, expect, it, vi } from 'vitest';
import { createServer } from '../src/server.js';

describe('attestation server', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it('returns an eligibility response when the OANDA account has no executed fills', async () => {
    const fetchMock = vi.fn(async (input: URL | RequestInfo) => {
      const url = new URL(input instanceof Request ? input.url : String(input));
      if (url.pathname === '/v3/accounts') {
        return new Response(JSON.stringify({ accounts: [{ id: 'account-1' }] }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      return new Response(JSON.stringify({
        pages: ['https://api-fxpractice.oanda.com/page/1'],
        transactions: [{ id: '1', type: 'MARKET_ORDER' }],
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    });
    vi.stubGlobal('fetch', fetchMock);

    const app = createServer(1n, 1, 'a'.repeat(32));
    const response = await app.request('/attest', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${'a'.repeat(32)}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        token: 'oanda-token',
        userPubKeyHash: 'a'.repeat(64),
      }),
    });

    expect(response.status).toBe(422);
    await expect(response.json()).resolves.toMatchObject({
      error: expect.stringContaining('No completed OANDA trades were found'),
    });
  });
});
