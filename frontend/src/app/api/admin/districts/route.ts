import { NextRequest } from 'next/server';
import { adminRoute } from '@/lib/admin-bff';

export async function GET(request: NextRequest) {
  return adminRoute(request, '/admin/districts');
}

export async function POST(request: NextRequest) {
  const body = await request.text();
  return adminRoute(request, '/admin/districts', { method: 'POST', body });
}
