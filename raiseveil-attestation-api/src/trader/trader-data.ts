import type { TraderData } from '../types.js';

const DEFAULT_API_URL = 'https://api-fxpractice.oanda.com';
const PAGE_SIZE = 1000;

interface OandaTransaction {
  id?: string;
  type?: string;
  time?: string;
  units?: string;
  pl?: string;
}

interface OandaAccount {
  id: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

async function requestJson(url: URL, token: string): Promise<unknown> {
  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
    },
    signal: AbortSignal.timeout(15_000),
  });

  if (!response.ok) {
    throw new Error(`OANDA request failed (${response.status} ${response.statusText})`);
  }

  return response.json() as Promise<unknown>;
}

function getApiBaseUrl(): URL {
  const baseUrl = new URL(process.env.OANDA_API_URL ?? DEFAULT_API_URL);
  if (baseUrl.protocol !== 'https:' && baseUrl.hostname !== 'localhost') {
    throw new Error('OANDA_API_URL must use HTTPS');
  }
  return baseUrl;
}

function getAccounts(response: unknown): OandaAccount[] {
  if (!isRecord(response) || !Array.isArray(response.accounts)) {
    throw new Error('OANDA accounts response is missing the accounts array');
  }

  return response.accounts.map((account: unknown) => {
    if (!isRecord(account) || typeof account.id !== 'string' || account.id.length === 0) {
      throw new Error('OANDA accounts response contains an invalid account');
    }
    return { id: account.id };
  });
}

function getPageUrls(response: unknown, baseUrl: URL): URL[] {
  if (!isRecord(response) || !Array.isArray(response.pages)) {
    throw new Error('OANDA transactions response is missing the pages array');
  }

  return response.pages.map((page: unknown) => {
    if (typeof page !== 'string') {
      throw new Error('OANDA transactions response contains an invalid page URL');
    }

    const url = new URL(page, baseUrl);
    if (url.origin !== baseUrl.origin) {
      throw new Error('OANDA transaction page URL has an unexpected origin');
    }
    return url;
  });
}

function getTransactions(response: unknown): OandaTransaction[] {
  if (!isRecord(response) || !Array.isArray(response.transactions)) {
    throw new Error('OANDA transaction page is missing the transactions array');
  }

  return response.transactions.map((transaction: unknown) => {
    if (!isRecord(transaction)) {
      throw new Error('OANDA transaction page contains an invalid transaction');
    }
    return transaction as OandaTransaction;
  });
}

export async function traderData(token: string): Promise<TraderData> {
  const normalizedToken = token.trim();
  if (normalizedToken.length === 0) {
    throw new Error('An OANDA API token is required');
  }

  const transactions = await fetchTraderData(normalizedToken);
  return computeTraderData(transactions);
}

function computeTraderData(transactions: OandaTransaction[]): TraderData {
  const fills = transactions.filter((transaction) => transaction.type === 'ORDER_FILL');

  if (fills.length === 0) {
    throw new Error('No filled trades were found for the OANDA accounts');
  }

  let tradeVolume = 0;
  let totalReturn = 0;
  let startTime = Number.POSITIVE_INFINITY;
  let lastTradeTime = Number.NEGATIVE_INFINITY;

  for (const transaction of fills) {
    const units = Number(transaction.units);
    const realizedPl = Number(transaction.pl);
    const tradeTime = Date.parse(transaction.time ?? '');

    if (!Number.isFinite(units) || !Number.isFinite(realizedPl) || !Number.isFinite(tradeTime)) {
      throw new Error(`OANDA fill transaction ${transaction.id ?? '(unknown id)'} has invalid statistics data`);
    }

    tradeVolume += Math.abs(units);
    totalReturn += realizedPl;
    startTime = Math.min(startTime, tradeTime);
    lastTradeTime = Math.max(lastTradeTime, tradeTime);
  }

  return {
    tradeCount: fills.length,
    tradeVolume,
    averageTradeSize: tradeVolume / fills.length,
    averageReturn: totalReturn / fills.length,
    startDate: new Date(startTime),
    lastTradeDate: new Date(lastTradeTime),
  };
}

async function fetchTraderData(token: string): Promise<OandaTransaction[]> {
  const baseUrl = getApiBaseUrl();
  const accountsUrl = new URL('/v3/accounts', baseUrl);
  const accounts = getAccounts(await requestJson(accountsUrl, token));
  if (accounts.length === 0) {
    throw new Error('No OANDA accounts are available for this token');
  }

  const transactions: OandaTransaction[] = [];

  for (const account of accounts) {
    const transactionsUrl = new URL(
      `/v3/accounts/${encodeURIComponent(account.id)}/transactions`,
      baseUrl,
    );
    transactionsUrl.searchParams.set('pageSize', String(PAGE_SIZE));
    const listing = await requestJson(transactionsUrl, token);

    for (const pageUrl of getPageUrls(listing, baseUrl)) {
      transactions.push(...getTransactions(await requestJson(pageUrl, token)));
    }
  }

  return transactions;
}
