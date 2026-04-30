import pool from '@/lib/db';

async function ensureSharesColumn() {
  await pool.query(
    `ALTER TABLE reviews ADD COLUMN IF NOT EXISTS shares_count INTEGER NOT NULL DEFAULT 0`
  );
}

export async function POST(request, { params }) {
  const { id: reviewId } = await params;
  try {
    await ensureSharesColumn();
    await pool.query(
      'UPDATE reviews SET shares_count = shares_count + 1 WHERE id = $1',
      [reviewId]
    );
    return Response.json({ ok: true });
  } catch {
    return Response.json({ ok: true }); // non-fatal
  }
}
