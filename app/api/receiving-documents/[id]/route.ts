// app/api/receiving-documents/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const docId = parseInt(id, 10);

    if (isNaN(docId)) {
      return NextResponse.json({ error: 'Invalid document ID format' }, { status: 400 });
    }

    const docRes = await query(
      `SELECT d.*, u.username as created_by_username 
       FROM receiving_documents d 
       LEFT JOIN users u ON d.created_by = u.id 
       WHERE d.id = $1`,
      [docId]
    );

    if (docRes.rows.length === 0) {
      return NextResponse.json({ error: 'Receiving document not found' }, { status: 404 });
    }

    const itemsRes = await query(
      `SELECT i.*, p.sku, p.name as product_name 
       FROM receiving_items i
       JOIN products p ON i.product_id = p.id
       WHERE i.receiving_document_id = $1
       ORDER BY i.id ASC`,
      [docId]
    );

    return NextResponse.json({
      success: true,
      data: {
        ...docRes.rows[0],
        items: itemsRes.rows,
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal Server Error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}