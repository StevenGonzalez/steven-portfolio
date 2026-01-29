import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const { name, email, message } = await req.json();

  // Simulate processing latency
  await new Promise((r) => setTimeout(r, 400));

  if (!name || !email || !message) {
    return NextResponse.json({ ok: false, error: "Missing fields" }, { status: 400 });
  }

  // Mock success response
  return NextResponse.json({ ok: true });
}
