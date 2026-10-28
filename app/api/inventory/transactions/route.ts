// app/api/inventory/transactions/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET() {
  try {
    const res = await query(`
      SELECT 
        t.id, t.product_id, p.sku, p.name AS product_name,
        t.receiving_document_id, d.document_number,
        t.quantity_changed, t.transaction_type,
        u.username AS performed_by, t.created_at
      FROM inventory_transactions t
      JOIN products p ON t.product_id = p.id
      LEFT JOIN receiving_documents d ON t.receiving_document_id = d.id
      LEFT JOIN users u ON t.created_by = u.id
      ORDER BY t.created_at DESC
    `);
    return NextResponse.json({ success: true, data: res.rows });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}