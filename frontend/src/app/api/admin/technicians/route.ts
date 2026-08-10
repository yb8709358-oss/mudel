import { NextRequest } from 'next/server';
import { revalidateTag } from 'next/cache';
import { adminRoute } from '@/lib/admin-bff';
import { TECHNICIAN_CACHE_TAG } from '@/lib/api';

export async function GET(request: NextRequest) {
  return adminRoute(request, '/admin/technicians');
}

export async function POST(request: NextRequest) {
  const body = await request.text();
  const res = await adminRoute(request, '/admin/technicians', { method: 'POST', body });
  if (res.ok) {
    await revalidateTag(TECHNICIAN_CACHE_TAG);
  }
  return res;
}
