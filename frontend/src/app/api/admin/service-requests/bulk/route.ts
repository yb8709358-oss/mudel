import { NextRequest } from 'next/server';
import { adminRoute } from '@/lib/admin-bff';

export async function POST(request: NextRequest) {
  const body = await request.text();
  return adminRoute(request, '/admin/service-requests/bulk', { method: 'POST', body });
}
