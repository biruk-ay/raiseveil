interface OandaAccountsResponse {
  accounts: Array<{ id: string }>;
}

function getOandaBaseUrl(): URL {
  const baseUrl = new URL(process.env.OANDA_API_URL ?? "https://api-fxpractice.oanda.com");
  if (baseUrl.protocol !== "https:" && baseUrl.hostname !== "localhost") {
    throw new Error("OANDA_API_URL must use HTTPS");
  }
  return baseUrl;
}

export async function validateOandaToken(token: string): Promise<void> {
  const response = await fetch(new URL("/v3/accounts", getOandaBaseUrl()), {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
    },
    signal: AbortSignal.timeout(15_000),
  });

  if (!response.ok) {
    if (response.status === 401 || response.status === 403) {
      throw new Error("OANDA rejected this API token");
    }
    throw new Error(`OANDA account check failed (${response.status})`);
  }

  const body: unknown = await response.json();
  if (
    typeof body !== "object" ||
    body === null ||
    !("accounts" in body) ||
    !Array.isArray((body as OandaAccountsResponse).accounts)
  ) {
    throw new Error("OANDA returned an invalid accounts response");
  }
}
