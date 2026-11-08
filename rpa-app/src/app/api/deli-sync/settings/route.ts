import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { autoSyncEnabled, scheduleTime } = body;
    const db = getDb();

    if (typeof autoSyncEnabled === 'boolean') {
      const valStr = autoSyncEnabled ? 'true' : 'false';
      db.prepare(`
        INSERT INTO settings (key, value, updated_at) 
        VALUES ('deli_sync_auto_enabled', ?, CURRENT_TIMESTAMP)
        ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = CURRENT_TIMESTAMP
      `).run(valStr);
      console.log(`[DeliSync Settings] deli_sync_auto_enabled -> ${valStr}`);
    }

    if (typeof scheduleTime === 'string' && /^\d{1,2}:\d{2}$/.test(scheduleTime)) {
      db.prepare(`
        INSERT INTO settings (key, value, updated_at) 
        VALUES ('deli_sync_schedule_time', ?, CURRENT_TIMESTAMP)
        ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = CURRENT_TIMESTAMP
      `).run(scheduleTime);
      console.log(`[DeliSync Settings] deli_sync_schedule_time -> ${scheduleTime}`);
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
