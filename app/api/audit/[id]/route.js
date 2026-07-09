import { NextResponse } from 'next/server';
import { logServerError } from '@/lib/logger';

export async function GET(request, { params }) {
  try {
    const { getAudit } = await import('@/lib/db');
    const { id } = await params;
    const audit = getAudit(parseInt(id, 10));

    if (!audit) {
      return NextResponse.json({ error: 'Audit not found' }, { status: 404 });
    }

    return NextResponse.json(audit);
  } catch (err) {
    logServerError('GET /api/audit/[id]', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
