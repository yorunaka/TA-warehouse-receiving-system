// app/api/products/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getCurrentUser, authorizeRoles } from '@/lib/auth';

// GET /api/products - List products (Operator & Admin)
export async function GET(req: NextRequest) {
  try {
    const res = await query(
      'SELECT id, sku, name, description, created_at FROM products ORDER BY id DESC'
    );
    return NextResponse.json({ success: true, data: res.rows });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST /api/products - Create Product (Admin Only)
export async function POST(req: NextRequest) {
  const user = await getCurrentUser(req);
  const auth = authorizeRoles(user, ['ADMIN']);
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const { sku, name, description } = await req.json();

    if (!sku || !name) {
      return NextResponse.json({ error: 'SKU and Name are required fields.' }, { status: 400 });
    }

    // Insert product (Database trigger fn_auto_create_inventory automatically initializes inventory table)
    const res = await query(
      'INSERT INTO products (sku, name, description) VALUES ($1, $2, $3) RETURNING *',
      [sku.trim().toUpperCase(), name.trim(), description || null]
    );

    return NextResponse.json({ success: true, data: res.rows[0] }, { status: 201 });
  } catch (error: any) {
    if (error.code === '23505') { // Unique violation on SKU
      return NextResponse.json({ error: 'Product SKU already exists.' }, { status: 409 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}