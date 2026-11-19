export type Tier = "LOW" | "MEDIUM" | "HIGH";

export type ReasonId =
  | "authority_impersonation"
  | "urgency"
  | "secrecy"
  | "safe_account_transfer"
  | "credential_request"
  | "guaranteed_returns"
  | "fake_document"
  | "new_recipient"
  | "unusual_amount";

export type Reason = { id: ReasonId; text: string; quote?: string; source: "rule" | "model" };

export type RiskAssessment = {
  messageId: string;
  score: number; // 0-100, computed by code
  tier: Tier;
  reasons: Reason[];
  floorApplied: number | null;
  models: { classifier: number | null; verifier: number | null };
  degraded: boolean; // true when a model failed or no API key, and rules carried it
  officialContact: { org: string; phone: string } | null;
  ms: number;
};

export type ChatMessage = {
  id: string;
  from: "them" | "me";
  sender: string;
  text: string;
  at: number;
  assessment?: RiskAssessment;
};

export type TransferStatus = "sent" | "cooling" | "awaiting_guardian" | "approved" | "stopped_refunded";

export type Transfer = {
  id: string;
  amount: number;
  recipient: string;
  isNewRecipient: boolean;
  tier: Tier;
  score: number;
  status: TransferStatus;
  reasons: Reason[];
  createdAt: number;
  releaseAt: number | null;
};

export type Wallet = {
  balance: number;
  limits: { usualMax: number; newRecipientLimit: number; dailyLimit: number };
  knownRecipients: string[];
  guardian: string;
};

export type State = {
  wallet: Wallet;
  chatRisk: { score: number; tier: Tier; reasons: Reason[] };
  messages: ChatMessage[];
  transfers: Transfer[];
};
