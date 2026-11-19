"use client";

import { useCallback, useEffect, useState } from "react";
import type { State, Transfer } from "@/lib/types";

export default function GuardianPhone() {
  const [state, setState] = useState<State | null>(null);
  const [busy, setBusy] = useState(false);
  const [now, setNow] = useState(Date.now());

  const refresh = useCallback(async () => {
    const r = await fetch("/api/state", { cache: "no-store" });
    setState((await r.json()).state);
  }, []);

  useEffect(() => {
    refresh();
    const a = setInterval(refresh, 2000);
    const b = setInterval(() => setNow(Date.now()), 1000);
    return () => { clearInterval(a); clearInterval(b); };
  }, [refresh]);

  async function act(t: Transfer, action: "approve" | "stop") {
    setBusy(true);
    const r = await fetch("/api/guardian", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ transferId: t.id, action }) });
    const d = await r.json();
    if (d.state) setState(d.state);
    setBusy(false);
  }

  const pending = state?.transfers.filter((t) => t.status === "awaiting_guardian" || t.status === "cooling") ?? [];
  const done = state?.transfers.filter((t) => !pending.includes(t)).slice(0, 6) ?? [];

  return (
    <div className="phone">
      <div className="brand" style={{ justifyContent: "center", paddingTop: 10 }}>
        <div className="mark">守</div>
        <div>SHOU Guardian <small>· {state?.wallet.guardian}</small></div>
      </div>

      {pending.length === 0 && (
        <div className="card" style={{ padding: 18, textAlign: "center" }}>
          <div style={{ fontSize: 40 }}>🟢</div>
          <div style={{ fontWeight: 700, fontSize: 18 }}>Nothing needs you right now</div>
          <div className="note">You'll see a request here if Mak sends money that looks risky.</div>
        </div>
      )}

      {pending.map((t) => (
        <div key={t.id} className="alert">
          <h3>{t.status === "awaiting_guardian" ? "🔴 Mak's transfer is on hold" : "🟡 Mak's transfer is cooling off"}</h3>
          <div className="big">RM {t.amount.toLocaleString("en-MY")}</div>
          <div>to <b>{t.recipient}</b>{t.isNewRecipient ? " — she has never paid this person before" : ""}</div>
          {t.reasons.length > 0 && (
            <ul className="why" style={{ fontSize: 14 }}>
              {[...new Map(t.reasons.map((r) => [r.id, r])).values()].map((r) => <li key={r.id}>{r.text}</li>)}
            </ul>
          )}
          <div className="note">
            {t.status === "awaiting_guardian"
              ? "If you do nothing, the money stays on hold. Stop returns it to Mak's balance; nobody else can receive it."
              : `If you do nothing, it goes through in ${Math.max(0, Math.ceil(((t.releaseAt ?? now) - now) / 1000))}s.`}
          </div>
          <div className="actions">
            <button className="btn stop" disabled={busy} onClick={() => act(t, "stop")}>Stop & refund</button>
            <button className="btn go" disabled={busy} onClick={() => act(t, "approve")}>Approve</button>
          </div>
          <div className="note">You see the amount, recipient and reason. You never see Mak's messages.</div>
        </div>
      ))}

      {done.length > 0 && (
        <div className="card">
          <h2>Recent</h2>
          <div className="list" style={{ paddingTop: 12 }}>
            {done.map((t) => (
              <div key={t.id} className="tx">
                <div className="row"><span className="amt">RM {t.amount.toLocaleString("en-MY")}</span><span className={`status ${t.status}`}>{t.status.replace("_", " ")}</span></div>
                <div className="note">to {t.recipient}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
