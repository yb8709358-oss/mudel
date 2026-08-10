import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import {
  AdminBffError,
  adminRoute,
  hasValidOrigin,
  safeErrorPayload,
} from '@/lib/admin-bff';
import { expectedAdminSessionValue } from '@/lib/admin-auth';

const ADMIN_PASSWORD = 'test-password';
const ADMIN_API_SECRET = 'test-secret';

beforeEach(() => {
  process.env.ADMIN_PASSWORD = ADMIN_PASSWORD;
  process.env.ADMIN_API_SECRET = ADMIN_API_SECRET;
  process.env.NEXT_PUBLIC_API_URL = 'http://backend.test';
});

afterEach(() => {
  delete process.env.ADMIN_PASSWORD;
  delete process.env.ADMIN_API_SECRET;
  delete process.env.NEXT_PUBLIC_API_URL;
  vi.unstubAllGlobals();
});

function makeRequest(url: string, headers: Record<string, string>): NextRequest {
  return new NextRequest(url, { headers });
}

describe('hasValidOrigin (admin-bff wiring)', () => {
  it('accepts a LAN IP origin matching the Host header (regression)', () => {
    const req = makeRequest('http://192.168.0.103:3001/api/admin/technicians/x', {
      origin: 'http://192.168.0.103:3001',
      host: '192.168.0.103:3001',
    });
    expect(hasValidOrigin(req)).toBe(true);
  });

  it('accepts a localhost origin', () => {
    const req = makeRequest('http://localhost:3000/api/admin/services/x', {
      origin: 'http://localhost:3000',
      host: 'localhost:3000',
    });
    expect(hasValidOrigin(req)).toBe(true);
  });

  it('accepts a reverse-proxied origin', () => {
    const req = makeRequest('http://app.internal:3000/api/admin/technicians/x', {
      origin: 'https://mudel.example.com',
      host: 'app.internal:3000',
      'x-forwarded-proto': 'https',
      'x-forwarded-host': 'mudel.example.com',
    });
    expect(hasValidOrigin(req)).toBe(true);
  });

  it('rejects a cross-site origin', () => {
    const req = makeRequest('http://localhost:3000/api/admin/services/x', {
      origin: 'http://evil.example.com',
      host: 'localhost:3000',
    });
    expect(hasValidOrigin(req)).toBe(false);
  });

  it('rejects an Origin header of "null"', () => {
    const req = makeRequest('http://localhost:3000/api/admin/services/x', {
      origin: 'null',
      host: 'localhost:3000',
    });
    expect(hasValidOrigin(req)).toBe(false);
  });

  it('allows requests without an Origin header', () => {
    const req = makeRequest('http://localhost:3000/api/admin/services/x', {
      host: 'localhost:3000',
    });
    expect(hasValidOrigin(req)).toBe(true);
  });
});

describe('safeErrorPayload (admin-bff upstream mapping)', () => {
  it('maps a FastAPI 422 detail array to 422 with the extracted messages', () => {
    const error = new AdminBffError(
      JSON.stringify([
        {
          loc: ['body', 'photo_url'],
          msg: 'Value error, photo_url must be an HTTPS image URL on an allowed host (images.unsplash.com or *.supabase.co)',
          type: 'value_error',
        },
        { loc: ['body', 'media', 0, 'url'], msg: 'Value error, url must be an HTTPS image URL', type: 'value_error' },
      ]),
      422,
    );
    const payload = safeErrorPayload(error);
    expect(payload.status).toBe(422);
    expect(payload.message).toContain('photo_url must be an HTTPS image URL');
    expect(payload.message).toContain('media.0.url');
  });

  it('passes through a plain-string 422 detail as the message', () => {
    const error = new AdminBffError('District slug already exists', 422);
    const payload = safeErrorPayload(error);
    expect(payload.status).toBe(422);
    expect(payload.message).toBe('District slug already exists');
  });

  it('surfaces an AppError-format 422 message instead of "API error: 422"', () => {
    const error = new AdminBffError('Technician slug already exists: ahmed-benali', 422);
    const payload = safeErrorPayload(error);
    expect(payload.status).toBe(422);
    expect(payload.message).toBe('Technician slug already exists: ahmed-benali');
  });

  it('does not turn a client validation error into a 502', () => {
    expect(safeErrorPayload(new AdminBffError('nope', 422)).status).toBe(422);
    expect(safeErrorPayload(new AdminBffError('slow down', 429)).status).toBe(429);
    expect(safeErrorPayload(new AdminBffError('bad request', 400)).status).toBe(400);
    expect(safeErrorPayload(new AdminBffError('conflict', 409)).status).toBe(409);
  });

  it('collapses only genuine server failures to a generic 502', () => {
    const payload = safeErrorPayload(new AdminBffError('boom', 500));
    expect(payload.status).toBe(502);
    expect(payload.message).toBe('The request could not be completed.');
  });
});

describe('adminRoute (end-to-end upstream mapping)', () => {
  it('returns 422 (not 502) when the upstream rejects a PATCH with validation errors', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            success: false,
            error: {
              code: 'VALIDATION_ERROR',
              message: 'Request validation failed.',
              details: [
                'body.photo_url: Value error, photo_url must be an HTTPS image URL on an allowed host (images.unsplash.com or *.supabase.co)',
              ],
            },
          }),
          { status: 422, headers: { 'content-type': 'application/json' } },
        ),
      ),
    );

    const req = makeRequest('http://localhost:3000/api/admin/technicians/x', {
      origin: 'http://localhost:3000',
      host: 'localhost:3000',
      'content-type': 'application/json',
      cookie: `admin_session=${expectedAdminSessionValue()}`,
    });

    const res = await adminRoute(req, '/technicians/4b6927c8-33ce-47d3-8518-88edd1bb7b92', {
      method: 'PATCH',
      body: JSON.stringify({ photo_url: 'https://somosfanaticos.fans/x.png' }),
    });

    expect(res.status).toBe(422);
    const body = await res.json();
    expect(body.message).toContain('photo_url must be an HTTPS image URL');
  });

  it('returns the backend AppError message when the upstream 422 body has no `detail`', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            success: false,
            error: {
              code: 'VALIDATION_ERROR',
              message: 'Technician slug already exists: ahmed-benali',
              details: [],
            },
          }),
          { status: 422, headers: { 'content-type': 'application/json' } },
        ),
      ),
    );

    const req = makeRequest('http://localhost:3000/api/admin/technicians', {
      origin: 'http://localhost:3000',
      host: 'localhost:3000',
      'content-type': 'application/json',
      cookie: `admin_session=${expectedAdminSessionValue()}`,
    });

    const res = await adminRoute(req, '/technicians', {
      method: 'POST',
      body: JSON.stringify({ name: 'Ahmed Benali', slug: 'ahmed-benali' }),
    });

    expect(res.status).toBe(422);
    const body = await res.json();
    expect(body.message).toBe('Technician slug already exists: ahmed-benali');
  });

  it('keeps 422 (not 502) when the upstream error body is not JSON', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response('boom', { status: 422, headers: { 'content-type': 'text/plain' } }),
      ),
    );

    const req = makeRequest('http://localhost:3000/api/admin/technicians', {
      origin: 'http://localhost:3000',
      host: 'localhost:3000',
      'content-type': 'application/json',
      cookie: `admin_session=${expectedAdminSessionValue()}`,
    });

    const res = await adminRoute(req, '/technicians', {
      method: 'POST',
      body: JSON.stringify({ name: 'X', slug: 'x' }),
    });

    expect(res.status).toBe(422);
    const body = await res.json();
    expect(body.message).toContain('API error: 422');
  });
});
