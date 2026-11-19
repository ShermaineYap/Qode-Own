import type { Reason, ReasonId, Tier } from "./types.ts";

/**
 * Deterministic layer, ported from SHOU (MUBA 2026).
 * Code owns the final score. Models add evidence; hard floors can never be lowered.
 */

const URGENCY = [
  "immediately", "right now", "within the hour", "urgent", "last chance", "hurry",
  "as soon as possible", "act now", "today", "before it is too late",
  "sekarang", "segera", "cepat", "dalam masa", "jangan tunggu", "hari ini",
  "马上", "立刻", "尽快", "限时", "现在", "快点",
];
const AUTHORITY = [
  "pdrm", "police", "polis", "bukit aman", "inspektor", "inspector", "sarjan", "sergeant",
  "lhdn", "inland revenue", "bank negara", "bnm", "court", "mahkamah", "warrant", "waran",
  "saman", "kastam", "customs", "imigresen", "immigration", "sprm", "macc",
  "警察", "法院", "传票",
];
const SECRECY = [
  "do not tell", "don't tell", "jangan beritahu", "jangan bagitahu", "confidential",
  "rahsia", "sulit", "secret investigation", "别告诉", "不要告诉", "保密",
];
const CREDENTIAL = [
  "otp", "one-time password", "tac", "kod tac", "verification code", "pin number",
  "password", "kata laluan", "seed phrase", "验证码", "密码",
];
const SAFE_ACCOUNT = [
  "safe account", "akaun selamat", "secure account", "akaun sementara", "holding account",
  "transfer your savings", "pindahkan simpanan", "安全账户",
];
const LURE = [
  "guaranteed return", "pulangan terjamin", "double your money", "investment opportunity",
  "peluang pelaburan", "processing fee", "release fee", "yuran pemprosesan", "保证收益", "保本",
];

const TEXT: Record<ReasonId, string> = {
  authority_impersonation: "Claims to be police, a court, LHDN or a bank.",
  urgency: "Pressures you to act right now.",
  secrecy: "Tells you to keep it from your family.",
  safe_account_transfer: "Asks you to move money to a 'safe' account. No real authority does this.",
  credential_request: "Asks for an OTP, TAC, PIN or password. No real institution ever does this.",
  guaranteed_returns: "Promises guaranteed money or asks for a fee to release money.",
  fake_document: "Shows an official-looking document to scare you.",
  new_recipient: "You have never sent money to this person before.",
  unusual_amount: "Much more than you normally send.",
};

const firstHit = (h: string, needles: string[]) => needles.find((n) => h.includes(n));

export type RuleResult = { score: number; floor: number; reasons: Reason[] };

export function messageRules(text: string): RuleResult {
  const m = text.toLowerCase();
  const reasons: Reason[] = [];
  let score = 0;
  const add = (id: ReasonId, w: number, quote?: string) => {
    reasons.push({ id, text: TEXT[id], quote, source: "rule" });
    score += w;
  };

  const u = firstHit(m, URGENCY);
  const a = firstHit(m, AUTHORITY);
  const s = firstHit(m, SECRECY);
  const c = firstHit(m, CREDENTIAL);
  const sa = firstHit(m, SAFE_ACCOUNT);
  const l = firstHit(m, LURE);

  if (a) add("authority_impersonation", 25, a);
  if (u) add("urgency", 20, u);
  if (s) add("secrecy", 25, s);
  if (sa) add("safe_account_transfer", 35, sa);
  if (c) add("credential_request", 40, c);
  if (l) add("guaranteed_returns", 20, l);

  // Hard floors: a model can raise the score, never lower it below these.
  let floor = 0;
  if (c) floor = 85;
  else if (a && u && s) floor = 80; // Macau scam signature
  else if (sa) floor = 70;
  else if (a && u) floor = 70;

  return { score: Math.min(100, score), floor, reasons };
}

export function transactionRules(amount: number, isNewRecipient: boolean, usualMax: number): RuleResult {
  const reasons: Reason[] = [];
  let score = 0;
  const ratio = usualMax > 0 ? amount / usualMax : 99;
  if (ratio >= 3) {
    reasons.push({ id: "unusual_amount", text: `About ${Math.round(ratio)}x your usual maximum.`, source: "rule" });
    score += ratio >= 10 ? 40 : 25;
  }
  if (isNewRecipient) {
    reasons.push({ id: "new_recipient", text: TEXT.new_recipient, source: "rule" });
    score += amount > 1000 ? 30 : 10;
  }
  return { score: Math.min(100, score), floor: 0, reasons };
}

export const tierFor = (score: number): Tier => (score >= 70 ? "HIGH" : score >= 40 ? "MEDIUM" : "LOW");

/**
 * Fuse: models give evidence, code owns the number.
 * The AI can only tighten: the result is never below the rule floor or the rule score.
 */
export function fuse(rule: RuleResult, classifier: number | null, verifier: number | null): { score: number; floorApplied: number | null } {
  const modelScores = [classifier, verifier].filter((x): x is number => typeof x === "number");
  const modelAvg = modelScores.length ? modelScores.reduce((a, b) => a + b, 0) / modelScores.length : null;
  const blended = modelAvg === null ? rule.score : Math.round(0.6 * modelAvg + 0.4 * rule.score);
  const score = Math.max(blended, rule.floor, modelAvg === null ? rule.score : 0);
  return { score: Math.min(100, score), floorApplied: rule.floor > blended ? rule.floor : null };
}

export const reasonText = (id: ReasonId) => TEXT[id];

const CONTACTS: { match: string[]; org: string; phone: string }[] = [
  { match: ["pdrm", "police", "polis", "bukit aman", "inspektor", "inspector", "sarjan", "sergeant"], org: "PDRM (call the real police, not the number in the chat)", phone: "999 / NSRC 997" },
  { match: ["lhdn", "inland revenue"], org: "LHDN HASiL Care Line", phone: "03-8911 1000" },
  { match: ["bank negara", "bnm"], org: "Bank Negara BNMTELELINK", phone: "1-300-88-5465" },
  { match: ["sprm", "macc"], org: "SPRM / MACC", phone: "1-800-88-6000" },
];

/** Official numbers the senior should call instead of the one in the chat. Verify before relying on them. */
export function officialContact(text: string) {
  const m = text.toLowerCase();
  const hit = CONTACTS.find((c) => c.match.some((k) => m.includes(k)));
  return hit ? { org: hit.org, phone: hit.phone } : null;
}
