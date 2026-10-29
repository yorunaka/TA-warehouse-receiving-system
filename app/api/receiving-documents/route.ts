// app/api/receiving-documents/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getClient, query } from '@/lib/db';
import { getCurrentUser, authorizeRoles } from '@/lib/auth';

// GET /api/receiving-documents - List Receiving Documents
export async function GET(req: NextRequest) {
  try {
    const res = await query(`
      SELECT 
        d.id,
        d.document_number,
        d.status,
        d.created_at,
        d.updated_at,
        u.username AS created_by_username,
        COUNT(i.id)::int AS item_count,
        COALESCE(SUM(i.expected_quantity), 0)::int AS total_expected,
        COALESCE(SUM(i.received_quantity), 0)::int AS total_received
       FROM receiving_documents d
       LEFT JOIN users u ON d.created_by = u.id
       LEFT JOIN receiving_items i ON d.id = i.receiving_document_id
       GROUP BY d.id, u.username
       ORDER BY d.id DESC
       `);
    return NextResponse.json({ success: true, data: res.rows });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST /api/receiving-documents - Create Document & Line Items (Admin Only)
export async function POST(req: NextRequest) {
  const user = await getCurrentUser(req);
  const auth = authorizeRoles(user, ['ADMIN']);
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { document_number, items } = await req.json();

  if (!document_number || !Array.isArray(items) || items.length === 0) {
    return NextResponse.json(
      { error: 'document_number and a non-empty items array are required.' },
      { status: 400 }
    );
  }

  const client = await getClient();

  try {
    await client.query('BEGIN');

    // 1. Create Document Header
    const docRes = await client.query(
      `INSERT INTO receiving_documents (document_number, status, created_by)
       VALUES ($1, 'DRAFT', $2)
       RETURNING *`,
      [document_number.trim(), user!.id]
    );
    const doc = docRes.rows[0];

    // 2. Insert Items
    for (const item of items) {
      if (!item.product_id || !item.expected_quantity || item.expected_quantity <= 0) {
        throw new Error(`Invalid item entry. Product ID and positive expected quantity required.`);
      }

      await client.query(
        `INSERT INTO receiving_items (receiving_document_id, product_id, expected_quantity, received_quantity)
         VALUES ($1, $2, $3, 0)`,
        [doc.id, item.product_id, item.expected_quantity]
      );
    }

    await client.query('COMMIT');
    return NextResponse.json({ success: true, data: doc }, { status: 201 });
  } catch (error: any) {
    await client.query('ROLLBACK');
    if (error.code === '23505') {
      return NextResponse.json({ error: 'Document number or duplicate product in items exists.' }, { status: 409 });
    }
    return NextResponse.json({ error: error.message }, { status: 400 });
  } finally {
    client.release();
  }
}