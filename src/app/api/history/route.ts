import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const HISTORY_KEY = (id: string) => `elixir:history:${id}`;
const MAX_HISTORY = 50;

async function getKV() {
  if (!process.env.KV_REST_API_URL) return null;
  try {
    const { kv } = await import("@vercel/kv");
    return kv;
  } catch {
    return null;
  }
}

function getRobloxId(req: NextRequest): string | null {
  try {
    const raw = req.cookies.get("roblox_user")?.value;
    if (!raw) return null;
    const obj = JSON.parse(decodeURIComponent(raw));
    return obj?.id ? String(obj.id) : null;
  } catch {
    return null;
  }
}

export type HistoryEntry = {
  id: string;
  prompt: string;
  response: string;
  modelId: string;
  ts: number;
};

// GET /api/history — fetch user's history
export async function GET(req: NextRequest) {
  const robloxId = getRobloxId(req);
  if (!robloxId) {
    return NextResponse.json({ history: [], error: "Not logged in" }, { status: 401 });
  }

  const kv = await getKV();
  if (!kv) return NextResponse.json({ history: [] });

  const history = await kv.get<HistoryEntry[]>(HISTORY_KEY(robloxId));
  return NextResponse.json({ history: history ?? [] });
}

// POST /api/history — save an entry (called by client after stream finishes)
export async function POST(req: NextRequest) {
  const robloxId = getRobloxId(req);
  if (!robloxId) {
    return NextResponse.json({ ok: false, error: "Not logged in" }, { status: 401 });
  }

  const { prompt, response, modelId } = await req.json();
  if (!prompt || !response || !modelId) {
    return NextResponse.json({ ok: false, error: "Missing fields" }, { status: 400 });
  }

  const kv = await getKV();
  if (!kv) return NextResponse.json({ ok: true }); // silently skip in dev

  const existing = (await kv.get<HistoryEntry[]>(HISTORY_KEY(robloxId))) ?? [];

  const entry: HistoryEntry = {
    id: crypto.randomUUID(),
    prompt: prompt.slice(0, 500),
    response: response.slice(0, 5000),
    modelId,
    ts: Date.now(),
  };

  // Prepend and keep last MAX_HISTORY entries
  const updated = [entry, ...existing].slice(0, MAX_HISTORY);
  await kv.set(HISTORY_KEY(robloxId), updated, { ex: 60 * 60 * 24 * 30 });

  return NextResponse.json({ ok: true, id: entry.id });
}

// DELETE /api/history — clear all history
export async function DELETE(req: NextRequest) {
  const robloxId = getRobloxId(req);
  if (!robloxId) return NextResponse.json({ ok: false }, { status: 401 });

  const kv = await getKV();
  if (kv) await kv.del(HISTORY_KEY(robloxId));

  return NextResponse.json({ ok: true });
}