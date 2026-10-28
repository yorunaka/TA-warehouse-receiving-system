// app/api/inventory/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET() {
  try {
    const res = await query(`
      SELECT 
        i.id, i.product_id, p.sku, p.name AS product_name, 
        i.available_quantity, i.updated_at
      FROM inventory i
      JOIN products p ON i.product_id = p.id
      ORDER BY p.name ASC
    `);
    return NextResponse.json({ success: true, data: res.rows });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}