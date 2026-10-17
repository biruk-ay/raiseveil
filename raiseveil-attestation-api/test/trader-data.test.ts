import { afterEach, describe, expect, it, vi } from 'vitest';
import { traderData } from '../src/trader/trader-data.js';

const baseUrl = 'https://api-fxpractice.oanda.com';

function jsonResponse(body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}

describe('traderData', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it('fetches every page for every account and computes aggregate fill statistics', async () => {
    vi.stubEnv('OANDA_API_URL', baseUrl);
    const fetchMock = vi.fn(async (input: URL | RequestInfo, _init?: RequestInit) => {
      const url = new URL(input instanceof Request ? input.url : String(input));

      if (url.pathname === '/v3/accounts') {
        return jsonResponse({ accounts: [{ id: 'account-1' }, { id: 'account-2' }] });
      }
      if (url.pathname === '/v3/accounts/account-1/transactions') {
        return jsonResponse({
          pages: [`${baseUrl}/page/1`, `${baseUrl}/page/2`],
        });
      }
      if (url.pathname === '/v3/accounts/account-2/transactions') {
        return jsonResponse({ pages: [`${baseUrl}/page/3`] });
      }
      if (url.pathname === '/page/1') {
        return jsonResponse({
          transactions: [
            { id: '1', type: 'ORDER_FILL', time: '2026-01-01T00:00:00Z', units: '10', pl: '2.50' },
            { id: '2', type: 'MARKET_ORDER', time: '2026-01-02T00:00:00Z', units: '100', pl: '0' },
          ],
        });
      }
      if (url.pathname === '/page/2') {
        return jsonResponse({
          transactions: [
            { id: '3', type: 'ORDER_FILL', time: '2026-01-03T00:00:00Z', units: '-4', pl: '-1.25' },
          ],
        });
      }
      if (url.pathname === '/page/3') {
        return jsonResponse({
          transactions: [
            { id: '4', type: 'ORDER_FILL', time: '2026-01-02T00:00:00Z', units: '6', pl: '0.75' },
          ],
        });
      }

      throw new Error(`Unexpected OANDA URL: ${url}`);
    });
    vi.stubGlobal('fetch', fetchMock);

    const result = await traderData('  test-token  ');

    expect(result).toEqual({
      tradeCount: 3,
      tradeVolume: 20,
      averageTradeSize: 20 / 3,
      averageReturn: 2 / 3,
      startDate: new Date('2026-01-01T00:00:00Z'),
      lastTradeDate: new Date('2026-01-03T00:00:00Z'),
    });
    expect(fetchMock).toHaveBeenCalledTimes(6);
    for (const [, options] of fetchMock.mock.calls) {
      expect(options?.headers).toMatchObject({ Authorization: 'Bearer test-token' });
    }
  });

  it('rejects an empty token', async () => {
    await expect(traderData('  ')).rejects.toThrow('An OANDA API token is required');
  });

  it('rejects accounts without filled transactions', async () => {
    vi.stubEnv('OANDA_API_URL', baseUrl);
    vi.stubGlobal('fetch', vi.fn(async (input: URL | RequestInfo) => {
      const url = new URL(input instanceof Request ? input.url : String(input));
      if (url.pathname === '/v3/accounts') {
        return jsonResponse({ accounts: [{ id: 'account-1' }] });
      }
      if (url.pathname === '/v3/accounts/account-1/transactions') {
        return jsonResponse({ pages: [`${baseUrl}/page/1`] });
      }
      return jsonResponse({ transactions: [{ id: '1', type: 'MARKET_ORDER' }] });
    }));

    await expect(traderData('test-token')).rejects.toThrow(
      'No filled trades were found for the OANDA accounts',
    );
  });
});
