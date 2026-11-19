import { NextResponse } from "next/server";
import { load, save, storeMode, tick } from "@/lib/store";
import { hasQwen, CLASSIFIER_MODEL, VERIFIER_MODEL } from "@/lib/qwen";

export const dynamic = "force-dynamic";

export async function GET() {
  const s = await load();
  if (tick(s)) await save(s);
  return NextResponse.json({
    state: s,
    meta: { store: storeMode(), qwen: hasQwen(), models: [CLASSIFIER_MODEL, VERIFIER_MODEL] },
  });
}
