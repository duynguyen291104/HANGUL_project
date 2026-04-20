import { NextResponse } from 'next/server';

const YOLO_SERVER = process.env.NEXT_PUBLIC_FLASK_API_URL || 'http://localhost:5001';

export async function GET() {
  try {
    const res = await fetch(`${YOLO_SERVER}/api/yolo/health`, { cache: 'no-store' });
    const data = await res.json();
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ status: 'disconnected', frame_count: 0 }, { status: 200 });
  }
}
