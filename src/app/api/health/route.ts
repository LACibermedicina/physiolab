import { db } from '@/lib/db';
import { json } from '@/lib/api';
export const dynamic = 'force-dynamic';
export async function GET() { await db.$queryRaw`SELECT 1`; return json({ ok: true }); }
