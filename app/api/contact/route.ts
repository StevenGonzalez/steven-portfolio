import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const { name, email, message } = await req.json();

  await new Promise((r) => setTimeout(r, 400));

  if (!name || !email || !message) {
    return NextResponse.json({ ok: false, error: "Missing fields" }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
