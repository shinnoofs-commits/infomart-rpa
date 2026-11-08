import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { isRpaRunning } from '@/lib/rpaState';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const db = getDb();
    const row = db.prepare("SELECT value FROM settings WHERE key = 'auto_rpa_enabled'").get() as { value: string } | undefined;
    const autoRpaEnabled = row ? row.value === 'true' : false;

    return NextResponse.json({
      autoRpaEnabled,
      isRpaRunning: isRpaRunning()
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { autoRpaEnabled } = body;

    const valueStr = autoRpaEnabled ? 'true' : 'false';
    const db = getDb();

    db.prepare(`
      INSERT INTO settings (key, value, updated_at) 
      VALUES ('auto_rpa_enabled', ?, CURRENT_TIMESTAMP)
      ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = CURRENT_TIMESTAMP
    `).run(valueStr);

    console.log(`[Settings] 自動発注設定を ${valueStr.toUpperCase()} に更新しました`);

    return NextResponse.json({
      success: true,
      autoRpaEnabled: autoRpaEnabled === true,
      isRpaRunning: isRpaRunning()
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
