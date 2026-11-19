import { NextResponse } from "next/server";
import { load, save, tick } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const action = body.action === "approve" ? "approve" : body.action === "stop" ? "stop" : null;
  if (!action) return NextResponse.json({ error: "action must be approve or stop" }, { status: 400 });

  const s = await load();
  tick(s);
  const t = s.transfers.find((x) => x.id === body.transferId);
  if (!t) return NextResponse.json({ error: "transfer not found" }, { status: 404 });
  if (t.status !== "awaiting_guardian" && t.status !== "cooling") {
    return NextResponse.json({ error: `transfer is already ${t.status}` }, { status: 409 });
  }

  if (action === "approve") {
    t.status = "approved";
  } else {
    // Stop only ever refunds to her own balance. The guardian cannot redirect money.
    t.status = "stopped_refunded";
    s.wallet.balance = Math.round((s.wallet.balance + t.amount) * 100) / 100;
  }
  t.releaseAt = null;
  await save(s);
  return NextResponse.json({ state: s, transfer: t });
}
