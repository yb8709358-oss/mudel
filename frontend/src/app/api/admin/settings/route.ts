import { NextRequest } from 'next/server';
import { revalidateTag } from 'next/cache';
import { adminRoute } from '@/lib/admin-bff';
import { SETTINGS_CACHE_TAG } from '@/lib/public-settings';

export async function GET(request: NextRequest) {
  return adminRoute(request, '/settings');
}

export async function PUT(request: NextRequest) {
  const body = await request.text();
  const res = await adminRoute(request, '/admin/settings', { method: 'PUT', body });
  if (res.ok) {
    await revalidateTag(SETTINGS_CACHE_TAG);
  }
  return res;
}
