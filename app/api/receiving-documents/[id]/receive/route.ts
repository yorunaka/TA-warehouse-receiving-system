// app/api/receiving-documents/[id]/receive/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getClient } from '@/lib/db';
import { getCurrentUser, authorizeRoles } from '@/lib/auth';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser(req);
  const auth = authorizeRoles(user, ['ADMIN', 'USER']);
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { id } = await params;
  const docId = parseInt(id, 10);

  if (isNaN(docId)) {
    return NextResponse.json({ error: 'Invalid document ID format' }, { status: 400 });
  }

  const body = await req.json();

  // --- BACKEND FIX: Flexibly capture item_id & parse string numbers ---
  const rawItemId = body.item_id ?? body.itemId ?? body.id;
  const itemId = parseInt(String(rawItemId), 10);
  const qtyReceived = parseInt(String(body.quantity_received ?? body.quantity), 10);

  if (isNaN(itemId) || isNaN(qtyReceived) || qtyReceived <= 0) {
    return NextResponse.json(
      { error: 'Valid item_id and positive quantity_received are required.' },
      { status: 400 }
    );
  }

  const client = await getClient();

  try {
    await client.query('BEGIN');

    // 1. Fetch Receiving Document Header with Row Lock
    const docRes = await client.query(
      'SELECT id, status FROM receiving_documents WHERE id = $1 FOR UPDATE',
      [docId]
    );

    if (docRes.rows.length === 0) {
      throw { status: 404, message: 'Receiving document not found.' };
    }

    const doc = docRes.rows[0];

    if (doc.status === 'COMPLETED' || doc.status === 'CANCELLED') {
      throw {
        status: 400,
        message: `Cannot process receipts. Document is currently in '${doc.status}' status.`,
      };
    }

    // 2. Fetch Line Item with Row Lock
    const itemRes = await client.query(
      'SELECT id, product_id, expected_quantity, received_quantity FROM receiving_items WHERE id = $1 AND receiving_document_id = $2 FOR UPDATE',
      [itemId, docId]
    );

    if (itemRes.rows.length === 0) {
      throw { status: 404, message: 'Line item not found in this receiving document.' };
    }

    const item = itemRes.rows[0];

    // --- OVER-RECEIPT CHECK ---
    const remainingExpected = item.expected_quantity - item.received_quantity;
    if (qtyReceived > remainingExpected) {
      throw {
        status: 400,
        message: `Over-receipt violation! Input quantity (${qtyReceived}) exceeds remaining expected quantity (${remainingExpected}).`,
      };
    }

    // --- ATOMIC INVENTORY INCREMENT & AUDIT LOG ---
    const updatedItemRes = await client.query(
      `UPDATE receiving_items 
       SET received_quantity = received_quantity + $1 
       WHERE id = $2 
       RETURNING *`,
      [qtyReceived, itemId]
    );

    await client.query(
      `UPDATE inventory 
       SET available_quantity = available_quantity + $1, updated_at = CURRENT_TIMESTAMP 
       WHERE product_id = $2`,
      [qtyReceived, item.product_id]
    );

    await client.query(
      `INSERT INTO inventory_transactions (product_id, receiving_document_id, quantity_changed, transaction_type, created_by)
       VALUES ($1, $2, $3, 'RECEIPT', $4)`,
      [item.product_id, docId, qtyReceived, user!.id]
    );

    // --- STATUS TRANSITION CHECK ---
    const allItemsRes = await client.query(
      'SELECT expected_quantity, received_quantity FROM receiving_items WHERE receiving_document_id = $1',
      [docId]
    );

    const isFullyReceived = allItemsRes.rows.every(
      (i) => i.received_quantity === i.expected_quantity
    );

    const targetStatus = isFullyReceived ? 'COMPLETED' : 'IN_PROGRESS';

    if (doc.status !== targetStatus) {
      await client.query(
        `UPDATE receiving_documents 
         SET status = $1, updated_at = CURRENT_TIMESTAMP 
         WHERE id = $2`,
        [targetStatus, docId]
      );
    }

    await client.query('COMMIT');

    return NextResponse.json({
      success: true,
      data: {
        receiving_document_status: targetStatus,
        received_item: updatedItemRes.rows[0],
      },
    });
  } catch (error: unknown) {
    await client.query('ROLLBACK');
    const err = error as { status?: number; message?: string };
    const status = err.status || 500;
    const message = err.message || 'Internal Server Error';
    return NextResponse.json({ error: message }, { status });
  } finally {
    client.release();
  }
}