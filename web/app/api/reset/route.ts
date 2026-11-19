import { NextResponse } from "next/server";
import { initialState, save } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function POST() {
  const s = initialState();
  await save(s);
  return NextResponse.json({ state: s });
}
