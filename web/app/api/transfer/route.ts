import { NextResponse } from "next/server";
import { load, save, tick, uid } from "@/lib/store";
import { decideTransfer } from "@/lib/assess";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const amount = Math.round(Number(body.amount) * 100) / 100;
  const recipient = String(body.recipient ?? "").slice(0, 80);
  if (!(amount > 0) || !recipient.trim()) return NextResponse.json({ error: "amount and recipient required" }, { status: 400 });

  const s = await load();
  tick(s);
  if (amount > s.wallet.balance) return NextResponse.json({ error: "Not enough balance" }, { status: 400 });

  const t = decideTransfer(s, uid(), amount, recipient);
  // Money leaves her balance now; a stopped transfer is refunded to her, never redirected.
  s.wallet.balance = Math.round((s.wallet.balance - amount) * 100) / 100;
  s.transfers.unshift(t);
  s.transfers = s.transfers.slice(0, 30);
  await save(s);
  return NextResponse.json({ state: s, transfer: t });
}
