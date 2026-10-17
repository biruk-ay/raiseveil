import { randomUUID } from "node:crypto";
import { FIELD_MODULUS } from "@midnight-ntwrk/compact-runtime";
import { and, desc, eq, isNotNull, ilike, sql } from "drizzle-orm";
import { Hono, type Context, type Next } from "hono";
import { auth, type AuthSession } from "../auth/index.js";
import { db } from "../db/client.js";
import { brokerConnections, traderProfiles, traderSnapshots, user } from "../db/schema.js";
import { decryptCredential, encryptCredential } from "../services/credentials.js";
import { requestSignedAttestation } from "../services/attestation.js";
import { readVerifiedContract } from "../services/midnight.js";
import { validateOandaToken } from "../services/oanda.js";
import { toPublicTraderStats } from "../services/trader-stats.js";

type Variables = {
  user: AuthSession["user"];
};

type ApiEnv = { Variables: Variables };

export const api = new Hono<ApiEnv>();

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function makeSlug(name: string, userId: string): string {
  const base = name
    .normalize("NFKD")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48) || "trader";
  return `${base}-${userId.slice(-8).toLowerCase()}`;
}

async function getOrCreateProfile(currentUser: AuthSession["user"]) {
  const [existing] = await db
    .select()
    .from(traderProfiles)
    .where(eq(traderProfiles.userId, currentUser.id))
    .limit(1);
  if (existing) {
    return existing;
  }

  const now = new Date();
  const [created] = await db
    .insert(traderProfiles)
    .values({
      id: randomUUID(),
      userId: currentUser.id,
      slug: makeSlug(currentUser.name, currentUser.id),
      displayName: currentUser.name,
      createdAt: now,
      updatedAt: now,
    })
    .returning();
  return created;
}

async function requireSession(
  c: Context<ApiEnv>,
  next: Next,
) {
  const result = await auth.api.getSession({ headers: c.req.raw.headers });
  if (!result) {
    return c.json({ error: "Sign in to continue" }, 401);
  }

  c.set("user", result.user);
  await next();
}

api.use("/api/me", requireSession);
api.use("/api/me/*", requireSession);

api.get("/api/health", (c) => c.json({ status: "ok" }));

api.get("/api/market/traders", async (c) => {
  const search = c.req.query("search")?.trim();
  const limit = Math.min(Math.max(Number(c.req.query("limit") ?? "24"), 1), 60);
  if (!Number.isInteger(limit)) {
    return c.json({ error: "limit must be an integer from 1 to 60" }, 400);
  }

  const filters = [
    eq(traderProfiles.isPublic, true),
    isNotNull(traderProfiles.contractAddress),
    isNotNull(traderSnapshots.id),
  ];
  if (search) {
    const searchPattern = `%${search.replace(/[%_\\]/g, "\\$&")}%`;
    filters.push(ilike(traderProfiles.displayName, searchPattern));
  }

  const rows = await db
    .select({
      slug: traderProfiles.slug,
      displayName: traderProfiles.displayName,
      bio: traderProfiles.bio,
      contractAddress: traderProfiles.contractAddress,
      tradeCount: traderSnapshots.tradeCount,
      tradeVolume: traderSnapshots.tradeVolume,
      averageTradeSize: traderSnapshots.averageTradeSize,
      averageReturn: traderSnapshots.averageReturn,
      startDate: traderSnapshots.startDate,
      lastTradeDate: traderSnapshots.lastTradeDate,
      observedAt: traderSnapshots.observedAt,
    })
    .from(traderProfiles)
    .innerJoin(user, eq(traderProfiles.userId, user.id))
    .innerJoin(traderSnapshots, eq(traderProfiles.id, traderSnapshots.profileId))
    .where(and(...filters))
    .orderBy(desc(sql`
      CASE
        WHEN cast(${traderSnapshots.averageReturn} as numeric) > ${FIELD_MODULUS / 2n}
        THEN cast(${traderSnapshots.averageReturn} as numeric) - ${FIELD_MODULUS}
        ELSE cast(${traderSnapshots.averageReturn} as numeric)
      END
    `))
    .limit(limit);

  return c.json({
    traders: rows.map((row) => ({
      slug: row.slug,
      displayName: row.displayName,
      bio: row.bio,
      contractAddress: row.contractAddress,
      stats: toPublicTraderStats({
        tradeCount: BigInt(row.tradeCount),
        tradeVolume: BigInt(row.tradeVolume),
        averageTradeSize: BigInt(row.averageTradeSize),
        averageReturn: BigInt(row.averageReturn),
        startDate: BigInt(row.startDate),
        lastTradeDate: BigInt(row.lastTradeDate),
      }),
      observedAt: row.observedAt.toISOString(),
    })),
  });
});

api.get("/api/profiles/:slug", async (c) => {
  const [row] = await db
    .select({
      slug: traderProfiles.slug,
      displayName: traderProfiles.displayName,
      bio: traderProfiles.bio,
      contractAddress: traderProfiles.contractAddress,
      tradeCount: traderSnapshots.tradeCount,
      tradeVolume: traderSnapshots.tradeVolume,
      averageTradeSize: traderSnapshots.averageTradeSize,
      averageReturn: traderSnapshots.averageReturn,
      startDate: traderSnapshots.startDate,
      lastTradeDate: traderSnapshots.lastTradeDate,
      observedAt: traderSnapshots.observedAt,
    })
    .from(traderProfiles)
    .innerJoin(user, eq(traderProfiles.userId, user.id))
    .leftJoin(traderSnapshots, eq(traderProfiles.id, traderSnapshots.profileId))
    .where(
      and(
        eq(traderProfiles.slug, c.req.param("slug")),
        eq(traderProfiles.isPublic, true),
      ),
    )
    .limit(1);

  if (!row) {
    return c.json({ error: "Public trader profile not found" }, 404);
  }

  const stats =
    row.tradeCount === null ||
    row.tradeVolume === null ||
    row.averageTradeSize === null ||
    row.averageReturn === null ||
    row.startDate === null ||
    row.lastTradeDate === null
      ? null
      : toPublicTraderStats({
          tradeCount: BigInt(row.tradeCount),
          tradeVolume: BigInt(row.tradeVolume),
          averageTradeSize: BigInt(row.averageTradeSize),
          averageReturn: BigInt(row.averageReturn),
          startDate: BigInt(row.startDate),
          lastTradeDate: BigInt(row.lastTradeDate),
        });

  return c.json({
    profile: {
      slug: row.slug,
      displayName: row.displayName,
      bio: row.bio,
      contractAddress: row.contractAddress,
      stats,
      observedAt: row.observedAt?.toISOString() ?? null,
    },
  });
});

api.get("/api/me", async (c) => {
  const currentUser = c.get("user");
  const profile = await getOrCreateProfile(currentUser);
  const [broker] = await db
    .select({ provider: brokerConnections.provider, updatedAt: brokerConnections.updatedAt })
    .from(brokerConnections)
    .where(eq(brokerConnections.userId, currentUser.id))
    .limit(1);
  const [snapshot] = await db
    .select()
    .from(traderSnapshots)
    .where(eq(traderSnapshots.profileId, profile.id))
    .limit(1);

  return c.json({
    user: { id: currentUser.id, name: currentUser.name, email: currentUser.email },
    profile: {
      slug: profile.slug,
      displayName: profile.displayName,
      bio: profile.bio,
      isPublic: profile.isPublic,
      contractAddress: profile.contractAddress,
      stats: snapshot
        ? toPublicTraderStats({
            tradeCount: BigInt(snapshot.tradeCount),
            tradeVolume: BigInt(snapshot.tradeVolume),
            averageTradeSize: BigInt(snapshot.averageTradeSize),
            averageReturn: BigInt(snapshot.averageReturn),
            startDate: BigInt(snapshot.startDate),
            lastTradeDate: BigInt(snapshot.lastTradeDate),
          })
        : null,
      observedAt: snapshot?.observedAt.toISOString() ?? null,
    },
    broker: broker
      ? { provider: broker.provider, connectedAt: broker.updatedAt.toISOString() }
      : null,
  });
});

api.put("/api/me/profile", async (c) => {
  const body: unknown = await c.req.json().catch(() => null);
  if (!isRecord(body)) {
    return c.json({ error: "Expected a JSON object" }, 400);
  }

  const { displayName, bio, isPublic } = body;
  if (
    typeof displayName !== "string" ||
    displayName.trim().length < 2 ||
    displayName.trim().length > 80 ||
    typeof bio !== "string" ||
    bio.length > 280 ||
    typeof isPublic !== "boolean"
  ) {
    return c.json(
      { error: "Provide a display name (2-80 characters), bio (up to 280), and public setting" },
      400,
    );
  }

  const currentUser = c.get("user");
  const profile = await getOrCreateProfile(currentUser);
  const [updated] = await db
    .update(traderProfiles)
    .set({
      displayName: displayName.trim(),
      bio: bio.trim(),
      isPublic,
      updatedAt: new Date(),
    })
    .where(eq(traderProfiles.id, profile.id))
    .returning();

  return c.json({
    profile: {
      slug: updated.slug,
      displayName: updated.displayName,
      bio: updated.bio,
      isPublic: updated.isPublic,
      contractAddress: updated.contractAddress,
    },
  });
});

api.get("/api/me/broker", async (c) => {
  const currentUser = c.get("user");
  const [broker] = await db
    .select({ provider: brokerConnections.provider, updatedAt: brokerConnections.updatedAt })
    .from(brokerConnections)
    .where(eq(brokerConnections.userId, currentUser.id))
    .limit(1);

  return c.json({
    broker: broker
      ? { provider: broker.provider, connectedAt: broker.updatedAt.toISOString() }
      : null,
  });
});

api.post("/api/me/broker/oanda", async (c) => {
  const body: unknown = await c.req.json().catch(() => null);
  if (!isRecord(body) || typeof body.token !== "string" || body.token.trim().length < 10) {
    return c.json({ error: "Provide a valid OANDA API token" }, 400);
  }

  const token = body.token.trim();
  await validateOandaToken(token);
  const encrypted = encryptCredential(token);
  const currentUser = c.get("user");
  const now = new Date();

  await db
    .insert(brokerConnections)
    .values({
      id: randomUUID(),
      userId: currentUser.id,
      provider: "oanda",
      credentialCiphertext: encrypted.ciphertext,
      credentialIv: encrypted.iv,
      credentialTag: encrypted.tag,
      createdAt: now,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: [brokerConnections.userId, brokerConnections.provider],
      set: {
        credentialCiphertext: encrypted.ciphertext,
        credentialIv: encrypted.iv,
        credentialTag: encrypted.tag,
        updatedAt: now,
      },
    });

  return c.json({ broker: { provider: "oanda", connected: true } }, 201);
});

api.delete("/api/me/broker/oanda", async (c) => {
  await db
    .delete(brokerConnections)
    .where(
      and(
        eq(brokerConnections.userId, c.get("user").id),
        eq(brokerConnections.provider, "oanda"),
      ),
    );
  return c.json({ broker: null });
});

api.post("/api/me/attestation", async (c) => {
  const currentUser = c.get("user");
  const [connection] = await db
    .select()
    .from(brokerConnections)
    .where(
      and(
        eq(brokerConnections.userId, currentUser.id),
        eq(brokerConnections.provider, "oanda"),
      ),
    )
    .limit(1);
  if (!connection) {
    return c.json({ error: "Connect an OANDA account before requesting an attestation" }, 409);
  }

  const token = decryptCredential({
    ciphertext: connection.credentialCiphertext,
    iv: connection.credentialIv,
    tag: connection.credentialTag,
  });
  const attestation = await requestSignedAttestation(token);
  return c.json({ attestation });
});

api.post("/api/me/contract", async (c) => {
  const body: unknown = await c.req.json().catch(() => null);
  if (!isRecord(body) || typeof body.contractAddress !== "string") {
    return c.json({ error: "Provide a deployed RaiseVeil contract address" }, 400);
  }

  const contract = await readVerifiedContract(body.contractAddress.trim());
  const stats = toPublicTraderStats(contract.stats);
  const currentUser = c.get("user");
  const profile = await getOrCreateProfile(currentUser);
  const now = new Date();

  await db.transaction(async (transaction) => {
    await transaction
      .update(traderProfiles)
      .set({ contractAddress: contract.contractAddress, updatedAt: now })
      .where(eq(traderProfiles.id, profile.id));
    await transaction
      .insert(traderSnapshots)
      .values({
        id: randomUUID(),
        profileId: profile.id,
        tradeCount: contract.stats.tradeCount.toString(),
        tradeVolume: contract.stats.tradeVolume.toString(),
        averageTradeSize: contract.stats.averageTradeSize.toString(),
        averageReturn: contract.stats.averageReturn.toString(),
        startDate: contract.stats.startDate.toString(),
        lastTradeDate: contract.stats.lastTradeDate.toString(),
        observedAt: now,
      })
      .onConflictDoUpdate({
        target: traderSnapshots.profileId,
        set: {
          tradeCount: contract.stats.tradeCount.toString(),
          tradeVolume: contract.stats.tradeVolume.toString(),
          averageTradeSize: contract.stats.averageTradeSize.toString(),
          averageReturn: contract.stats.averageReturn.toString(),
          startDate: contract.stats.startDate.toString(),
          lastTradeDate: contract.stats.lastTradeDate.toString(),
          observedAt: now,
        },
      });
  });

  return c.json({
    profile: {
      slug: profile.slug,
      contractAddress: contract.contractAddress,
      stats,
      observedAt: now.toISOString(),
    },
  });
});
