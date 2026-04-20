import { NextResponse } from 'next/server';

const YOLO_SERVER = process.env.NEXT_PUBLIC_FLASK_API_URL || 'http://localhost:5001';

export async function POST() {
  try {
    const res = await fetch(`${YOLO_SERVER}/api/yolo/start`, { method: 'POST', cache: 'no-store' });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch {
    return NextResponse.json({ error: 'YOLO server unavailable' }, { status: 503 });
  }
}
