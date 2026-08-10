import { NextResponse } from 'next/server';
import { getPublicSettings } from '@/lib/public-settings';

/**
 * Public, unauthenticated proxy for the site settings used by client
 * components (e.g. error pages). Keeps the backend URL and fetch caching
 * server-side so the browser never talks to the backend directly.
 */
export async function GET() {
  const settings = await getPublicSettings();
  return NextResponse.json({ success: true, data: settings });
}
