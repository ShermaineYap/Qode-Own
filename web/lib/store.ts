import type { State } from "./types.ts";

/**
 * Shared state for the senior's phone and the guardian's phone.
 * Uses Upstash Redis (Vercel Storage / Marketplace) when its env vars exist.
 * Falls back to process memory, which is fine locally but NOT reliable on serverless.
 */

const URL_ = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL || "";
const TOKEN = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN || "";
const KEY = "shou:state:demo";

export const storeMode = () => (URL_ && TOKEN ? "redis" : "memory");

export const initialState = (): State => ({
  wallet: {
    balance: 12500,
    limits: { usualMax: 500, newRecipientLimit: 1000, dailyLimit: 3000 },
    knownRecipients: ["Kopitiam Ah Seng", "Air Selangor", "TNB", "Aisyah (daughter)"],
    guardian: "Adam (son)",
  },
  chatRisk: { score: 0, tier: "LOW", reasons: [] },
  messages: [],
  transfers: [],
});

const g = globalThis as unknown as { __shouState?: State };

async function redis(cmd: unknown[]) {
  const r = await fetch(URL_, {
    method: "POST",
    headers: { Authorization: `Bearer ${TOKEN}`, "Content-Type": "application/json" },
    body: JSON.stringify(cmd),
    cache: "no-store",
  });
  if (!r.ok) throw new Error(`redis ${r.status}`);
  return (await r.json()).result;
}

export async function load(): Promise<State> {
  if (storeMode() === "redis") {
    const raw = await redis(["GET", KEY]);
    return raw ? (JSON.parse(raw) as State) : initialState();
  }
  return (g.__shouState ??= initialState());
}

export async function save(s: State) {
  if (storeMode() === "redis") await redis(["SET", KEY, JSON.stringify(s)]);
  else g.__shouState = s;
}

/** Release cooling-off transfers whose timer has passed. */
export function tick(s: State, now = Date.now()) {
  let changed = false;
  for (const t of s.transfers) {
    if (t.status === "cooling" && t.releaseAt && now >= t.releaseAt) {
      t.status = "sent";
      changed = true;
    }
  }
  return changed;
}

export const uid = () => Math.random().toString(36).slice(2, 10);
