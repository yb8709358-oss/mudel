import { NextRequest } from 'next/server';
import { adminIdRoute } from '@/lib/admin-bff';

type Props = {
  params: Promise<{ id: string }>;
};

export async function GET(request: NextRequest, { params }: Props) {
  const { id } = await params;
  return adminIdRoute(request, '/admin/districts', id);
}

export async function PATCH(request: NextRequest, { params }: Props) {
  const { id } = await params;
  const body = await request.text();
  return adminIdRoute(request, '/admin/districts', id, { method: 'PATCH', body });
}

export async function DELETE(request: NextRequest, { params }: Props) {
  const { id } = await params;
  return adminIdRoute(request, '/admin/districts', id, { method: 'DELETE' });
}
