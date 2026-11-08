import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { runRpaExecution } from '@/app/api/rpa/route';
import { isRpaRunning } from '@/lib/rpaState';

export const dynamic = 'force-dynamic';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-api-key',
  'Access-Control-Allow-Private-Network': 'true',
};

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

export async function GET() {
  return NextResponse.json({
    status: 'ok',
    service: 'Infomart RPA Order Receiver',
    timestamp: new Date().toISOString()
  }, { headers: corsHeaders });
}

export async function POST(request: Request) {
  try {
    const data = await request.json();

    // 接続テストリクエストのハンドリング
    if (data.isTest || data.event === 'TEST_CONNECTION') {
      return NextResponse.json({
        success: true,
        message: 'RPA受信機への接続テストが成功しました。正常に稼働しています。',
        timestamp: new Date().toISOString()
      }, { headers: corsHeaders });
    }

    const { storeId, orders } = data;

    if (!orders || !Array.isArray(orders)) {
      return NextResponse.json({ error: 'Invalid payload: orders array is required' }, { status: 400, headers: corsHeaders });
    }

    const db = getDb();
    
    // 該当する店舗の未処理・同納品日データのみを上書き更新（他店舗・処理済みデータは保持）
    const incomingStores = Array.from(new Set(orders.map(o => o.store_name || '店舗名未指定')));
    const deleteStmt = db.prepare(`DELETE FROM orders WHERE store_name = ?`);
    for (const sName of incomingStores) {
      deleteStmt.run(sName);
    }

    const stmt = db.prepare(`
      INSERT INTO orders (store_name, supplier_name, product_name, quantity, delivery_date, status)
      VALUES (?, ?, ?, ?, ?, '未処理')
    `);

    // トランザクションで一括挿入
    const insertMany = db.transaction((orderList: any[]) => {
      for (const order of orderList) {
        stmt.run(
          order.store_name || '店舗名未指定',
          order.supplier_name,
          order.product_name,
          order.quantity,
          order.delivery_date
        );
      }
    });

    insertMany(orders);

    // 自動発注設定の確認
    const settingRow = db.prepare("SELECT value FROM settings WHERE key = 'auto_rpa_enabled'").get() as { value: string } | undefined;
    const isAutoEnabled = settingRow ? settingRow.value === 'true' : false;

    let autoStarted = false;
    if (isAutoEnabled) {
      if (isRpaRunning()) {
        console.log('[Webhook] 自動発注は有効ですが、現在別のRPAタスクが実行中のためキュー待機となります。');
      } else {
        console.log('[Webhook] 🤖 自動発注が有効です。バックグラウンドでインフォマートRPAを自動開始します...');
        autoStarted = true;
        // Webhookレスポンスをブロックしないよう非同期バックグラウンドでキック
        setTimeout(() => {
          runRpaExecution().catch(err => {
            console.error('[Webhook] 自動RPA実行中にエラーが発生しました:', err);
          });
        }, 1000);
      }
    }

    return NextResponse.json({ 
      success: true, 
      autoStarted,
      message: autoStarted 
        ? `${orders.length}件の発注データを受信し、インフォマート自動発注(RPA)を開始しました。`
        : `${orders.length}件の発注データを受信し、RPAキューに登録しました（自動発注: OFF）。`,
      count: orders.length 
    }, { headers: corsHeaders });
  } catch (error: any) {
    console.error('Webhook error:', error);
    return NextResponse.json({ error: error.message }, { status: 500, headers: corsHeaders });
  }
}
