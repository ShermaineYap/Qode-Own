<div align="center">

# 守 SHOU

**S**cam-**H**alting **O**n-chain **U**tility

**A Chrome extension that monitors scams passively on WhatsApp and Telegram, backed-up by a stablecoin wallet whose owner self-define spending rules while she is calm, and the chain enforces them when she is not.**

MUBA Blockchain Hackathon 2026 · Sui Track 01 (Payments & Stablecoins) · Gonka (AI for Society)

<p align="center">
  <img src="https://img.shields.io/badge/🏅_SUI-Honourable_Mention-4DA2FF?style=for-the-badge" alt="SUI - Honourable Mention" />
  <img src="https://img.shields.io/badge/🏅_GonkaRouter_(AI_for_Society_Good)-11th–20th_place-10B981?style=for-the-badge" alt="GonkaRouter (AI for Society Good) - 11th–20th place" />
</p>

</div>

---

## Screenshots

![SHOU landing page](docs/img/landing.png)

---

## Executive summary

Elder financial scams are an **authority** problem, not a detection problem: victims are manipulated into sending money voluntarily despite warnings. SHOU solves this by coupling a **Chrome extension** that passively scores chat risk inside a TEE with an **on-chain Move policy** configured while calm. The AI verdict serves as a floor, never a ceiling—it can tighten spending limits, never loosen them.

---

## Problem

**Victims aren't hacked—they are manipulated into sending money voluntarily ("manufactured consent").**

1. **95% of fraud is "authorised":** Bank Negara Malaysia reports that 95% of online fraud cases involve victims authorizing transfers themselves. Conventional security built to catch stolen credentials completely fails here.
2. **Seniors suffer disproportionately:** Despite making up under 10% of victims, older adults absorb nearly 28% of total financial scam losses (over RM1.47B in investment scams alone, primarily coordinated through WhatsApp and Telegram).
3. **No existing tool intervenes at the moment of payment:** Caller-ID tools lose visibility once conversations move to chat apps, and banks monitor device sessions rather than manipulative chats. Instant payment rails move funds irreversibly within seconds.

---

## Solution

**A Chrome extension and wallet guardian that protect passively, not reactively —
reading the conversation and halting the money before it moves, instead of flagging
it after.**

An extension that only warns is one more notification to dismiss. A wallet with
spending limits but no awareness of the conversation cannot tell groceries from a
scam. Together, the conversation decides how the money behaves.

### Features

1. **Passive detection.** The extension reads the on-screen WhatsApp Web chat DOM
   automatically — no copy-pasting, no button to press — and shows an inline 🟢/🟡/🔴
   badge. Every message is redacted on-device, then scored via the **Gonka Router**:
   DeepSeek-V4-Flash classifies, MiniMax-M2.7 cross-verifies, and **deterministic
   floors set a risk minimum no model is permitted to talk down.**
2. **Private, tamper-evident scoring.** Scoring happens behind a signing boundary
   built to the AWS Nitro/Nautilus pattern — only a hash, a tier and a signature leave
   the enclave. That signature is verified on-chain in `enclave.move`, so a verdict
   cannot be altered afterwards.
3. **Behavioural circuit breaker → Seniority Mode.** When a flagged conversation
   correlates with an unusual payment, the transfer doesn't fail — it **waits** in
   on-chain escrow, and high-risk transfers require trusted-family co-approval, all
   enforced by `policy.move`, not by our backend.
4. **Safe by construction, seedless by design.** The AI's verdict is a floor, never a
   ceiling. `AdminCap` appears nowhere in `policy.move`, so guardians can block and
   refund a transfer **to her**, never redirect it. zkLogin + Google sign-in removes
   the seed phrase entirely, and a weighted 2·1·1 multisig means she spends alone, her
   son alone cannot, and two relatives together can recover her account.
5. **Truth Score & transparency (Gonka).** Every scored message returns a 0–100% Truth
   Score with an itemised reasoning trace (`urgency`, `authority-impersonation`,
   `financial-solicitation`) and the **Gonka Request ID** for that inference, shown on
   both the extension badge and the guardian dashboard — so what triggered a hold is
   never a black box.

---

## User flow

**Setup (once, while she's calm):** her son installs the extension → she signs in with
Google (zkLogin, no seed phrase) → together they set her spending limits and name her
guardians on the dashboard → they add a recovery circle (weighted multisig).

**Every day (she does nothing differently):** she chats on WhatsApp as usual → a
coloured dot scores each message privately inside the enclave → she sends money the
ordinary way; a small payment lands instantly, exactly as it would without SHOU.

**When something is wrong:** a flagged conversation + an unusual payment → the
transfer holds in on-chain escrow instead of failing → her guardian sees an amount, a
recipient, and what happens if he does nothing (never her messages) → he stops it and
she's refunded in full, or approves it and it goes through.

---

## Tech stack

| Layer | Technology | Why this one |
|---|---|---|
| Policy engine | **Sui Move**, 2024 edition — `policy` · `enclave` · `redflag` | Shared objects let several people act on one wallet without anyone taking custody. |
| Asset | **Testnet USDC** | Elders think in dollars; a guard denominated in a volatile token protects nothing. |
| Client | **@mysten/sui 2.28**, `SuiGrpcClient` | JSON-RPC is deprecated on public fullnodes. |
| Private compute | **Nautilus pattern**, ed25519 + BCS over `node:crypto` | The message is scored where nobody can read it; the chain verifies the enclave's signature itself. |
| Scoring | **Gonka Router** — DeepSeek-V4-Flash classifies, MiniMax-M2.7 cross-verifies | Called from *inside* the enclave, so the privacy claim is a property, not a promise. |
| Sign-in | **zkLogin + Enoki 1.2** | An 80-year-old will not write down twelve words. |
| Recovery | **Weighted multisig** (2·1·1, threshold 2) | The only shape that lets her act alone while still allowing recovery. |
| Detection surface | **Chrome extension, Manifest V3** — TypeScript / esbuild | One content script per site; its only permission is `storage`. |
| Guardian surfaces | **Plain TypeScript + esbuild**, no framework | Three screens over one JSON API — the page holds no key. |
| Tests | **`node:test`** + `sui move test` | 91+ tests across TS and Move; `verify.sh` runs all of them in one command. |

---

## Architecture

![SHOU architecture](docs/img/architecture.jpeg)

The trust boundary: raw message text goes in; only a hash, a tier and a signature come
out. `policy.move` verifies that signature on-chain itself, so the dashboard, driver
and circuit breaker carry the verdict but cannot alter it.

---

## Smart contract addresses (Sui Testnet)

| Contract / Object | Sui Testnet Object ID |
|---|---|
| **Package ID** | `0xdd78bd78aebe0694629773e85e66c37ac8dd9f287d166d052b2656090661ed1f` |
| **SeniorityPolicy** | `0x0cd5e7ccd1f498f0e0148654354f90d1588adde8f4c6d31da221f8c161e5103d` |
| **Community DenyList** | `0x2d84887eb54755afa56a5a0b77256001d6d396aeb89c89db95f858fd3c1dd2fc` |
| **Enclave Registry** | `0xd7c8cb09640080ec692ce505d1da5bb866c7a0fd6da70daea2e913d429de03f2` |
| **Held Escrow Request (Demo)** | `0x29bdc9d2d1f7f884312ff70ccc2cd27fa707147bf2b2585768175baf92e3e976` |
| **Asset Coin Type** | `0xa1ec7fc00a6f40db9693ad1415d0c193ad3906494428cf252621037bd7117e29::usdc::USDC` |
| **Guardian Approver** | `0x4e48678637d9ff9fc151ee5b8083d21910ca280cee592b613addd0b8d9c32ddc` |

View on [SuiVision](https://testnet.suivision.xyz/package/0xdd78bd78aebe0694629773e85e66c37ac8dd9f287d166d052b2656090661ed1f).

---

## Running it

### Option A — Docker (recommended for judges)

```bash
docker compose up
```

- Main Web Experience & Simulator: [http://localhost:3000](http://localhost:3000)
- Guardian Command Dashboard: [http://localhost:4200](http://localhost:4200)
- Chrome Extension Package: [http://localhost:3080/extension.tar.gz](http://localhost:3080/extension.tar.gz)

### Option B — Local development

**Prerequisites:** Node 22+ and the `sui` CLI. Copy `shou/.env.example` to
`shou/.env` and fill in `GONKA_API_KEY`.

```bash
cd shou
for d in enclave packages/*/; do (cd "$d" && npm install); done
./verify.sh          # tests, typechecks, builds
```

```bash
cd shou/enclave                   && SHOU_TEST_SCORER=1 npm start   # :3100
cd shou/packages/circuit-breaker  && npm start                      # :4000
cd shou/packages/zklogin-demo     && npm start                      # :3000
cd shou/packages/dashboard        && npm start                      # :4200
cd shou/packages/extension        && npm run build                  # then load unpacked
```

### Testing the extension (15 seconds)

1. `chrome://extensions` → enable **Developer mode** → **Load unpacked** →
   `shou/packages/extension/dist`.
2. Open `web.whatsapp.com` and watch the badge score live chat.
3. No-install option: use the **Live Web Simulator** at `localhost:3000` with the
   preset scam pills (🚨 Fake Police, 💔 Romance Trap).

---

## Tracks — and why we align

### Sui Track 01 — Payments & Stablecoins

The track names *"stablecoin wallets, treasury, escrow"* as a core idea. `SeniorityPolicy`
and `TransferRequest` **are** that — a stablecoin wallet with programmable, on-chain
controls, not AI with a blockchain bolted on.

| Judging criterion | How SHOU answers it |
|---|---|
| **Product UX** | Google sign-in, not a seed phrase. Guardians see plain English ("someone you trust has to approve"), never a tier number. Weighted recovery means she's never dependent on one relative for daily spending. |
| **Solves a real problem + real-world readiness** | Target user is specific (an elderly parent receiving remittances via WhatsApp/Facebook — the two channels Malaysian police name most often), cited to primary sources above. We state plainly that the production path is the WhatsApp Business API, not DOM scraping. |
| **Technical implementation (complete > complex)** | One vertical slice finished end to end: 91+ tests passing, a real seven-step testnet USDC transfer, five critical security bugs found *and* fixed under adversarial review, every blocker logged in `docs/DECISIONS.md`. |
| **Presentation** | Three demo acts: sign in and score a live message; run the seven-step flow on testnet; tell the contract a large transfer is safe and watch it refuse anyway. |

### Gonka — AI for Society

A live web app (`localhost:3000`) where a message is pasted or read from chat and
returns a verification report, meeting every mandatory requirement:

1. **All AI reasoning runs on the Gonka Network** via the official gateway
   (`api.gonkarouter.io/v1/chat/completions`) — zero third-party AI proxies.
2. **Multi-model consensus:** DeepSeek-V4-Flash (classifier) and MiniMax-M2.7
   (skeptical cross-verifier) see the same redacted message independently; code — not
   a model — computes the final weighted score, with hard floors no model can lower.
3. **Claim extraction:** passive DOM extraction from WhatsApp, or raw text/URL input
   via the simulator.
4. **Truth Score & reasoning trace:** a 0–100% score with itemised reasoning
   (`urgency`, `authority-impersonation`, `secrecy`).
5. **Transparency UI:** both the extension badge and dashboard show the exact **Gonka
   Request ID** for every inference call, proving it ran on Gonka.

**Innovation:** the AI's verdict is a floor, never a ceiling — most AI safety products
fail open; ours degrades to "her own rules still apply," never to "approved." A wrong
or unavailable model raises risk to MEDIUM rather than silently clearing a transfer.

---

## Business model

**B2B / Enterprise model:** The buyers are banks and e-wallets, not end users—regulatory mandates now hold financial institutions directly liable for scam losses.

- **Target market:** ~95 licensed banks and e-money issuers in Malaysia, protecting 3.9M+ older adults.
- **Pricing:** Per Active Guarded Account (PAGA) model (RM6–RM12/account/month) targeting 75–80% gross margins.
- **Value proposition:** Preventing a single fraud reimbursement claim (£85,000 / ~RM460,000) funds thousands of guarded-account-years of protection. SHOU acts as balance-sheet fraud insurance.
- **Regulatory catalyst:** Active mandates—such as Malaysia's 7-day reimbursement rule, Singapore's SRF, and the UK's 50/50 liability split—force institutions to budget for preventative solutions.

---

## Regulatory & compliance

- **Shared responsibility regimes:** Strict global and regional compensation frameworks (Malaysia's 2026 7-day reimbursement rule, Singapore SRF, UK PSR) shift fraud loss liability directly onto institutions, making pre-transaction prevention mandatory.
- **Non-custodial & no licensing needed:** SHOU operates strictly as a technology partner rather than an e-wallet or bank. User funds remain non-custodial (`AdminCap` does not exist in `policy.move`).
- **Data privacy & PDPA:** Messages are redacted on-device and scored inside an isolated enclave. Banks and contracts only receive cryptographic risk tiers and signatures—never raw chat content.
- **Production path:** Prototype reads DOM for demo purposes; production commercial deployment integrates via the official WhatsApp Business API.

---

## What's now, what's next

**Built & tested today:** live end-to-end testnet USDC transfer · enclave scoring +
on-chain circuit breaker · seedless/gasless zkLogin + Enoki onboarding · Seniority
Mode (weighted 2·1·1 multisig) enforced on-chain.

**What's next:**

1. **AWS Nitro attestation** — close the key-provenance gap with real hardware proof.
2. **WhatsApp Business API** — compliant, ToS-safe messaging channel for production.
3. **Guardian dashboard + UI polish** — full front-end ready for real users, with
   Enoki-sponsored transactions so neither elder nor guardian holds SUI.
4. **Bank pilot → mainnet** — piloting with a real bank against BNM's liability-shift
   rules.

---

## Honest limitations

- **No Nitro instance yet.** Signature verification is real; key provenance is
  currently asserted by us, not proven by AWS hardware.
- **Only two of three candidate models are in the live path.** Kimi-K2.6 was excluded
  on measured latency (median 26.5s against a 14s deadline), not quality.
- **WhatsApp and Telegram DOM reading is demo-only**, not ToS-compliant for production — see
  Regulatory & Compliance above.

---

## Team — TEAM WEB 1.5

1. **Daniel anak Boniface Alin** — Research, business and financial value, target users, statistics, regulatory.
2. **Hana Tang** — Overall planning, Move contracts, TEE enclave, driver SDK, zkLogin and recovery.
3. **Shermaine Yap Shi Min** — Gonka Router integration, Chrome extension, guardian dashboard.
4. **Liaw Yi Wen** — Research, business and financial value, target users, statistics, regulatory.

*MUBA Blockchain Hackathon 2026 · Sui Track 01 (Payments & Stablecoins) · Gonka (AI for Society)*