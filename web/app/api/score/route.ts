import { NextResponse } from "next/server";
import { load, save, uid } from "@/lib/store";
import { assessMessage, updateChatRisk } from "@/lib/assess";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const text = String(body.text ?? "").slice(0, 2000).trim();
  const sender = String(body.sender ?? "Unknown").slice(0, 80);
  const from = body.from === "me" ? "me" : "them";
  if (!text) return NextResponse.json({ error: "text required" }, { status: 400 });

  const id = uid();
  // Only incoming messages are scored.
  const assessment = from === "them" ? await assessMessage(id, text) : undefined;

  const s = await load();
  s.messages.push({ id, from, sender, text, at: Date.now(), assessment });
  s.messages = s.messages.slice(-40);
  updateChatRisk(s);
  await save(s);
  return NextResponse.json({ state: s, assessment });
}
