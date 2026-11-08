import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await request.json();
    const db = getDb();

    // 更新可能なフィールドを動的に構築
    const updateFields: string[] = [];
    const values: any[] = [];

    if (body.quantity !== undefined) {
      updateFields.push('quantity = ?');
      values.push(body.quantity);
    }
    if (body.status !== undefined) {
      updateFields.push('status = ?');
      values.push(body.status);
    }
    if (body.error_message !== undefined) {
      updateFields.push('error_message = ?');
      values.push(body.error_message);
    }

    if (updateFields.length === 0) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
    }

    updateFields.push('updated_at = CURRENT_TIMESTAMP');
    values.push(id);

    const query = `UPDATE orders SET ${updateFields.join(', ')} WHERE id = ?`;
    const stmt = db.prepare(query);
    const result = stmt.run(...values);

    if (result.changes === 0) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
