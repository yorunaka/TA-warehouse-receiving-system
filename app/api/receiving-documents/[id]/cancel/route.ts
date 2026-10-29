// app/api/receiving-documents/[id]/cancel/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getClient } from '@/lib/db';
import { getCurrentUser, authorizeRoles } from '@/lib/auth';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser(req);
  // Authorize Supervisor or Operator depending on your business rules
  const auth = authorizeRoles(user, ['ADMIN']); 
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { id } = await params;
  const docId = parseInt(id, 10);

  if (isNaN(docId)) {
    return NextResponse.json({ error: 'Invalid document ID' }, { status: 400 });
  }

  const client = await getClient();

  try {
    await client.query('BEGIN');

    // Lock the document record for update
    const docRes = await client.query(
      'SELECT id, status FROM receiving_documents WHERE id = $1 FOR UPDATE',
      [docId]
    );

    if (docRes.rows.length === 0) {
      throw { status: 404, message: 'Receiving document not found.' };
    }

    const doc = docRes.rows[0];

    if (doc.status === 'COMPLETED') {
      throw {
        status: 400,
        message: 'Cannot cancel a document that has already been COMPLETED.',
      };
    }

    if (doc.status === 'CANCELLED') {
      throw {
        status: 400,
        message: 'Document is already CANCELLED.',
      };
    }

    // Update status to CANCELLED
    const updatedRes = await client.query(
      `UPDATE receiving_documents 
       SET status = 'CANCELLED', updated_at = CURRENT_TIMESTAMP 
       WHERE id = $1 
       RETURNING *`,
      [docId]
    );

    await client.query('COMMIT');

    return NextResponse.json({
      success: true,
      data: updatedRes.rows[0],
    });
  } catch (error: unknown) {
    await client.query('ROLLBACK');
    const err = error as { status?: number; message?: string };
    return NextResponse.json(
      { error: err.message || 'Internal Server Error' },
      { status: err.status || 500 }
    );
  } finally {
    client.release();
  }
}