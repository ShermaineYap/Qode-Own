import type { ReasonId } from "./types.ts";

/**
 * Qwen via Alibaba Cloud Model Studio (OpenAI-compatible API).
 * Two models score the SAME redacted message in parallel: a fast classifier and a stronger verifier.
 */

const BASE = process.env.QWEN_BASE_URL || "https://dashscope-intl.aliyuncs.com/compatible-mode/v1";
const KEY = process.env.QWEN_API_KEY || process.env.DASHSCOPE_API_KEY || "";
export const CLASSIFIER_MODEL = process.env.QWEN_CLASSIFIER_MODEL || "qwen-flash";
export const VERIFIER_MODEL = process.env.QWEN_VERIFIER_MODEL || "qwen-plus";

export const hasQwen = () => Boolean(KEY);

const ALLOWED: ReasonId[] = [
  "authority_impersonation", "urgency", "secrecy", "safe_account_transfer",
  "credential_request", "guaranteed_returns", "fake_document",
];

const SYSTEM = `You are a scam-risk analyst for Malaysian seniors. You read ONE chat message (it may be Bahasa Malaysia, English, Manglish or Chinese; personal details are already redacted).
Return ONLY JSON: {"score": 0-100, "reasons": [{"id": one of ${ALLOWED.join("|")}, "quote": "exact short phrase from the message"}]}
score = how likely this message is part of a scam that will lead to a money transfer. Ordinary family, shopping, bill or clinic messages score low. Quote only words that really appear in the message.`;

export type ModelVerdict = { score: number; reasons: { id: ReasonId; quote: string }[]; model: string };

async function ask(model: string, text: string, timeoutMs = 12000): Promise<ModelVerdict | null> {
  if (!KEY) return null;
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const r = await fetch(`${BASE}/chat/completions`, {
      method: "POST",
      signal: ctrl.signal,
      headers: { Authorization: `Bearer ${KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        temperature: 0,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: SYSTEM },
          { role: "user", content: text },
        ],
      }),
    });
    if (!r.ok) {
      console.error("[qwen]", model, r.status, (await r.text()).slice(0, 300));
      return null;
    }
    const data = await r.json();
    const parsed = JSON.parse(data.choices?.[0]?.message?.content ?? "{}");
    const score = Math.max(0, Math.min(100, Number(parsed.score)));
    if (!Number.isFinite(score)) return null;
    const lower = text.toLowerCase();
    const reasons = (Array.isArray(parsed.reasons) ? parsed.reasons : [])
      .filter((x: any) => ALLOWED.includes(x?.id))
      // No invented evidence: a quote only counts if it is really in the message.
      .map((x: any) => ({ id: x.id as ReasonId, quote: typeof x.quote === "string" && lower.includes(x.quote.toLowerCase()) ? x.quote : "" }));
    return { score, reasons, model };
  } catch (e) {
    console.error("[qwen]", model, e instanceof Error ? e.message : e);
    return null;
  } finally {
    clearTimeout(t);
  }
}

export async function scoreWithQwen(text: string) {
  const [classifier, verifier] = await Promise.all([ask(CLASSIFIER_MODEL, text), ask(VERIFIER_MODEL, text)]);
  return { classifier, verifier };
}

/** Remove personal details before any model sees the message. */
export function redact(text: string) {
  return text
    .replace(/\b\d{6}-?\d{2}-?\d{4}\b/g, "[IC]")
    .replace(/(\+?6?0)?1\d[\s-]?\d{3,4}[\s-]?\d{4}\b/g, "[PHONE]")
    .replace(/\b\d{8,16}\b/g, "[ACCOUNT]")
    .replace(/[\w.+-]+@[\w-]+\.[\w.]+/g, "[EMAIL]");
}
