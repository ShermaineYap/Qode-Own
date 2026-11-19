import { fuse, messageRules, officialContact, reasonText, tierFor, transactionRules } from "./rules.ts";
import { hasQwen, redact, scoreWithQwen } from "./qwen.ts";
import type { Reason, RiskAssessment, State, Tier, Transfer } from "./types.ts";

export async function assessMessage(messageId: string, text: string): Promise<RiskAssessment> {
  const t0 = Date.now();
  const rule = messageRules(text);
  const { classifier, verifier } = hasQwen() ? await scoreWithQwen(redact(text)) : { classifier: null, verifier: null };
  const { score, floorApplied } = fuse(rule, classifier?.score ?? null, verifier?.score ?? null);

  // Merge reasons: rule evidence first, then model evidence the rules did not already have.
  const reasons: Reason[] = [...rule.reasons];
  for (const v of [classifier, verifier]) {
    for (const r of v?.reasons ?? []) {
      if (!reasons.some((x) => x.id === r.id)) reasons.push({ id: r.id, text: reasonText(r.id), quote: r.quote || undefined, source: "model" });
    }
  }

  return {
    messageId,
    score,
    tier: tierFor(score),
    reasons: score >= 40 ? reasons : reasons.filter((r) => r.source === "rule"),
    floorApplied,
    models: { classifier: classifier?.score ?? null, verifier: verifier?.score ?? null },
    degraded: !classifier || !verifier,
    officialContact: score >= 40 ? officialContact(text) : null,
    ms: Date.now() - t0,
  };
}

/** Chat risk is the highest message risk in the conversation: one scam message is enough. */
export function updateChatRisk(s: State) {
  let best = { score: 0, tier: "LOW" as Tier, reasons: [] as Reason[] };
  for (const m of s.messages) {
    if (m.assessment && m.assessment.score > best.score) best = { score: m.assessment.score, tier: m.assessment.tier, reasons: m.assessment.reasons };
  }
  s.chatRisk = best;
}

const COOLING_MS = 30_000;

/**
 * Decide what happens to a payment. Rules set while calm come first:
 * a small payment to someone she already pays always goes through.
 * Otherwise the stricter of chat risk and transaction risk decides. The AI can only tighten.
 */
export function decideTransfer(s: State, id: string, amount: number, recipientRaw: string): Transfer {
  const recipient = recipientRaw.trim();
  const isNew = !s.wallet.knownRecipients.some((r) => r.toLowerCase() === recipient.toLowerCase());
  const { usualMax, newRecipientLimit, dailyLimit } = s.wallet.limits;
  const now = Date.now();

  let score: number;
  let reasons: Reason[];
  if (!isNew && amount <= usualMax) {
    score = 0;
    reasons = [];
  } else {
    const tx = transactionRules(amount, isNew, usualMax);
    const chat = s.chatRisk;
    score = Math.max(tx.score, chat.score);
    if (isNew && amount > newRecipientLimit) score = Math.max(score, 45);
    if (amount > dailyLimit) score = Math.max(score, 45);
    // A scam-looking chat plus money to someone new is the core SHOU signal.
    if (chat.score >= 40 && isNew) score = Math.max(score, 75);
    reasons = [...(chat.score >= 40 ? chat.reasons : []), ...tx.reasons];
  }

  const tier = tierFor(score);
  const status = tier === "HIGH" ? "awaiting_guardian" : tier === "MEDIUM" ? "cooling" : "sent";
  return {
    id,
    amount,
    recipient,
    isNewRecipient: isNew,
    tier,
    score,
    status,
    reasons,
    createdAt: now,
    releaseAt: status === "cooling" ? now + COOLING_MS : null,
  };
}
