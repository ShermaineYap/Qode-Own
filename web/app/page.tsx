"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { State, Transfer } from "@/lib/types";
import { SCENARIOS } from "@/lib/scenarios";

type Meta = { store: string; qwen: boolean; models: string[] };

const STATUS_TEXT: Record<Transfer["status"], string> = {
  sent: "Sent",
  cooling: "Cooling off",
  awaiting_guardian: "Waiting for family",
  approved: "Approved by family",
  stopped_refunded: "Stopped · refunded",
};

const RISK_TEXT = {
  LOW: "No warning signs in this chat",
  MEDIUM: "Be careful: this chat has warning signs",
  HIGH: "This chat looks like a scam",
};

export default function SeniorPhone() {
  const [state, setState] = useState<State | null>(null);
  const [meta, setMeta] = useState<Meta | null>(null);
  const [text, setText] = useState("");
  const [sender, setSender] = useState(SCENARIOS[0].sender);
  const [busy, setBusy] = useState(false);
  const [amount, setAmount] = useState("8000");
  const [recipient, setRecipient] = useState("Akaun Selamat BNM");
  const [error, setError] = useState("");
  const [now, setNow] = useState(Date.now());
  const chatRef = useRef<HTMLDivElement>(null);

  const refresh = useCallback(async () => {
    const r = await fetch("/api/state", { cache: "no-store" });
    const d = await r.json();
    setState(d.state);
    setMeta(d.meta);
  }, []);

  useEffect(() => {
    refresh();
    const a = setInterval(refresh, 2500);
    const b = setInterval(() => setNow(Date.now()), 1000);
    return () => { clearInterval(a); clearInterval(b); };
  }, [refresh]);

  useEffect(() => {
    chatRef.current?.scrollTo({ top: chatRef.current.scrollHeight, behavior: "smooth" });
  }, [state?.messages.length]);

  async function post(url: string, body: unknown) {
    setError("");
    const r = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const d = await r.json();
    if (!r.ok) setError(d.error ?? "Something went wrong");
    if (d.state) setState(d.state);
    return d;
  }

  async function incoming(msg: string, from: string) {
    if (!msg.trim()) return;
    setBusy(true);
    await post("/api/score", { text: msg, sender: from, from: "them" });
    setText("");
    setBusy(false);
  }

  async function send() {
    setBusy(true);
    await post("/api/transfer", { amount: Number(amount), recipient });
    setBusy(false);
  }

  const risk = state?.chatRisk;

  return (
    <>
      <header className="top">
        <div className="brand">
          <div className="mark">守</div>
          <div>SHOU <small>· pause the money, not just warn</small></div>
        </div>
        <div className="meta">
          <span className="pill">Track: Digital Trust</span>
          {meta && <span className={`pill ${meta.qwen ? "" : "warn"}`}>{meta.qwen ? `Qwen: ${meta.models.join(" + ")}` : "Qwen key not set · rules only"}</span>}
          {meta && <span className={`pill ${meta.store === "redis" ? "" : "warn"}`}>Store: {meta.store}</span>}
          <a className="pill" href="/guardian" target="_blank">Open guardian phone ↗</a>
          <button className="pill" onClick={() => post("/api/reset", {})}>Reset demo</button>
        </div>
      </header>

      <main className="grid">
        <section className="card">
          <div className="chathead">
            <div className="avatar">{sender.slice(0, 1)}</div>
            <div>
              <div style={{ fontWeight: 700 }}>{sender}</div>
              <div style={{ fontSize: 12, opacity: 0.8 }}>Simulated WhatsApp chat · every incoming message is checked</div>
            </div>
          </div>
          <div className="chat" ref={chatRef}>
            {state?.messages.length === 0 && <div className="tiny">Tap a scenario below, or type a message the scammer would send.</div>}
            {state?.messages.map((m) => (
              <div key={m.id} className={`bubble ${m.from === "me" ? "me" : ""}`}>
                {m.from === "them" && <div className="tiny" style={{ marginTop: 0 }}>{m.sender}</div>}
                <div>{m.text}</div>
                {m.assessment && (
                  <>
                    <span className={`badge ${m.assessment.tier}`}>
                      {m.assessment.tier === "HIGH" ? "🔴" : m.assessment.tier === "MEDIUM" ? "🟡" : "🟢"} {m.assessment.tier} risk · {m.assessment.score}
                    </span>
                    {m.assessment.reasons.length > 0 && (
                      <ul className="why">
                        {m.assessment.reasons.map((r) => (
                          <li key={r.id}>{r.text}{r.quote ? <> — “{r.quote}”</> : null}</li>
                        ))}
                      </ul>
                    )}
                    {m.assessment.officialContact && (
                      <div className="contact">📞 Call the real one: <b>{m.assessment.officialContact.org}</b> · {m.assessment.officialContact.phone}</div>
                    )}
                    <div className="tiny">
                      {m.assessment.models.classifier !== null || m.assessment.models.verifier !== null
                        ? `Models: ${m.assessment.models.classifier ?? "–"} / ${m.assessment.models.verifier ?? "–"}`
                        : "Rules only"}
                      {m.assessment.floorApplied ? ` · rule floor ${m.assessment.floorApplied}` : ""}
                      {` · ${m.assessment.ms} ms`}
                      {m.assessment.degraded && meta?.qwen ? " · a model did not answer" : ""}
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
          <div className="composer">
            <input value={sender} onChange={(e) => setSender(e.target.value)} style={{ maxWidth: 170 }} aria-label="Sender" />
            <input value={text} onChange={(e) => setText(e.target.value)} placeholder="Message from the caller…" onKeyDown={(e) => e.key === "Enter" && incoming(text, sender)} />
            <button className="btn" disabled={busy} onClick={() => incoming(text, sender)}>{busy ? "Checking…" : "Receive"}</button>
          </div>
          <div className="scenarios">
            {SCENARIOS.map((s) => (
              <button key={s.label} className="btn ghost" disabled={busy} onClick={() => { setSender(s.sender); incoming(s.text, s.sender); }}>{s.label}</button>
            ))}
          </div>
        </section>

        <section className="card">
          <h2>Mak's e-wallet <span style={{ textTransform: "none" }}>Guardian: {state?.wallet.guardian}</span></h2>
          <div className="wallet">
            <div>
              <div className="note">Balance</div>
              <div className="balance">RM {state?.wallet.balance.toLocaleString("en-MY", { minimumFractionDigits: 2 })}</div>
            </div>
            {risk && (
              <div className={`risk ${risk.tier}`}>
                {RISK_TEXT[risk.tier]}
                <span>{risk.tier === "LOW" ? "Payments follow your usual limits." : "Payments to someone new will pause until family checks."}</span>
              </div>
            )}
            <label className="field">Send to
              <input value={recipient} onChange={(e) => setRecipient(e.target.value)} />
            </label>
            <label className="field">Amount (RM)
              <input value={amount} inputMode="decimal" onChange={(e) => setAmount(e.target.value)} />
            </label>
            <div className="quick">
              <button className="btn ghost" onClick={() => { setRecipient("Akaun Selamat BNM"); setAmount("8000"); }}>RM8,000 · new account</button>
              <button className="btn ghost" onClick={() => { setRecipient("Kopitiam Ah Seng"); setAmount("12"); }}>RM12 · kopitiam</button>
              <button className="btn ghost" onClick={() => { setRecipient("TNB"); setAmount("186.40"); }}>RM186 · TNB bill</button>
            </div>
            <button className="btn send" disabled={busy} onClick={send}>Send money</button>
            {error && <div className="note" style={{ color: "var(--high)" }}>{error}</div>}
            <div className="note">Limits set with her son while calm: usual max RM{state?.wallet.limits.usualMax}, new recipient RM{state?.wallet.limits.newRecipientLimit}, daily RM{state?.wallet.limits.dailyLimit}. The AI can tighten these, never loosen them.</div>
          </div>
          <h2>Transfers</h2>
          {state && state.transfers.length === 0 && <div className="empty">No transfers yet.</div>}
          <div className="list">
            {state?.transfers.map((t) => (
              <div key={t.id} className="tx">
                <div className="row">
                  <span className="amt">RM {t.amount.toLocaleString("en-MY")}</span>
                  <span className={`status ${t.status}`}>
                    {STATUS_TEXT[t.status]}
                    {t.status === "cooling" && t.releaseAt ? ` · ${Math.max(0, Math.ceil((t.releaseAt - now) / 1000))}s` : ""}
                  </span>
                </div>
                <div className="note">to {t.recipient}{t.isNewRecipient ? " (new)" : ""}</div>
                {t.status === "awaiting_guardian" && <div className="note">Your money is safe. It moves only if {state.wallet.guardian} approves; if he stops it, it comes back to you.</div>}
              </div>
            ))}
          </div>
        </section>
      </main>
      <div className="foot">Demo with made-up names and numbers. SHOU started at MUBA Hackathon 2026; this version is rebuilt on Qwen and Qoder for QodeFest.</div>
    </>
  );
}
