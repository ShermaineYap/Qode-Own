# SHOU 2.0 web app (QodeFest 2026)

**Track:** Digital Trust · **Pitch line:** "Warnings don't work, because she believes the scammer. So we don't warn. We pause the money."

SHOU reads the conversation a senior is having. When it looks like a scam, her next transfer to someone new pauses until a family member approves it. Stop refunds her in full.

- `/` — the senior's phone: simulated WhatsApp chat (each incoming message scored) and her e-wallet
- `/guardian` — the guardian's phone: Approve or Stop held transfers

## How it works

1. Incoming message → personal details redacted in code.
2. Two Qwen models score the same redacted message in parallel (fast classifier + stronger verifier).
3. Code fuses the scores. Hard rule floors (OTP request 85, authority + urgency + secrecy 80, "safe account" 70) can never be lowered by a model.
4. On "Send money": calm-time rules first (small payment to a known payee always goes through), then the stricter of chat risk and transaction risk decides: LOW sent, MEDIUM 30 s cooling-off, HIGH waits for the guardian.

## Run locally

```bash
cd web
cp .env.example .env.local   # add QWEN_API_KEY (optional: works rules-only without it)
npm install
npm run dev
```

## Deploy on Vercel

Import the repo, set **Root Directory** to `web`, add `QWEN_API_KEY`, and connect an Upstash Redis store (Storage tab) so both phones share state.

## Credit

The idea, rule lexicons and floors come from SHOU at MUBA Blockchain Hackathon 2026 (`shou/`, `shermaine-gonka/` in this repo). This version drops Sui, the enclave and Gonka, and is rebuilt on Qwen and Qoder.
