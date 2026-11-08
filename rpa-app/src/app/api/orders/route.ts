import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { requestRpaAbort, setRpaRunning } from '@/lib/rpaState';

export const dynamic = 'force-dynamic';

// 発注データ一覧を取得
export async function GET() {
  try {
    const db = getDb();
    const orders = db.prepare('SELECT * FROM orders ORDER BY created_at DESC').all();
    return NextResponse.json({ orders });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// ダミーの発注データを追加（デモ用）
export async function POST() {
  try {
    const db = getDb();
    const insert = db.prepare('INSERT INTO orders (supplier_name, product_name, quantity, delivery_date) VALUES (?, ?, ?, ?)');
    
    // トランザクションで複数件追加
    const addMany = db.transaction((items) => {
      for (const item of items) {
        insert.run(item.supplier_name, item.product_name, item.quantity, item.delivery_date);
      }
    });

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dateStr = tomorrow.toISOString().split('T')[0];

    addMany([
      { supplier_name: '日本食研株式会社【新】', product_name: '商品A', quantity: 10, delivery_date: dateStr },
      { supplier_name: '株式会社久世', product_name: '商品B', quantity: 5, delivery_date: dateStr },
      { supplier_name: '自店', product_name: '商品C', quantity: 20, delivery_date: dateStr },
    ]);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// 取得した全データを一括削除する
export async function DELETE() {
  try {
    // 実行中のRPAがあれば即座に停止
    requestRpaAbort();
    setRpaRunning(false);

    const db = getDb();
    db.prepare('DELETE FROM orders').run();
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// 全データの数量を0にしてステータスを未処理に戻す（クリアテスト用）
export async function PATCH() {
  try {
    const db = getDb();
    db.prepare("UPDATE orders SET quantity = 0, status = '未処理'").run();
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
