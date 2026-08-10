import { NextRequest } from 'next/server';
import { revalidateTag } from 'next/cache';
import { adminIdRoute } from '@/lib/admin-bff';
import { TECHNICIAN_CACHE_TAG } from '@/lib/api';

type Props = {
  params: Promise<{ id: string }>;
};

export async function GET(request: NextRequest, { params }: Props) {
  const { id } = await params;
  return adminIdRoute(request, '/admin/technicians', id);
}

export async function PATCH(request: NextRequest, { params }: Props) {
  const { id } = await params;
  const body = await request.text();
  const res = await adminIdRoute(request, '/admin/technicians', id, { method: 'PATCH', body });
  if (res.ok) {
    await revalidateTag(TECHNICIAN_CACHE_TAG);
  }
  return res;
}

export async function DELETE(request: NextRequest, { params }: Props) {
  const { id } = await params;
  const res = await adminIdRoute(request, '/admin/technicians', id, { method: 'DELETE' });
  if (res.ok) {
    await revalidateTag(TECHNICIAN_CACHE_TAG);
  }
  return res;
}
