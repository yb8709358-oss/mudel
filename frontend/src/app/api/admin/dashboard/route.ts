import { NextRequest } from 'next/server';
import { adminRoute } from '@/lib/admin-bff';

export async function GET(request: NextRequest) {
  return adminRoute(request, '/admin/dashboard');
}
