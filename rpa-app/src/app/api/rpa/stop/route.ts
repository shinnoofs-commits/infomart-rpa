import { NextResponse } from 'next/server';
import { requestRpaAbort, setRpaRunning } from '@/lib/rpaState';

export const dynamic = 'force-dynamic';

export async function POST() {
  try {
    console.log('[RPA] ユーザーから強制停止リクエストを受信しました。処理を中断します...');
    requestRpaAbort();
    setRpaRunning(false);

    return NextResponse.json({
      success: true,
      message: 'RPA処理を強制停止しました。'
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
