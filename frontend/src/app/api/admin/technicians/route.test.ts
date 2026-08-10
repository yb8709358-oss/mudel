import { describe, expect, it, vi, beforeEach } from 'vitest';
import type { NextRequest } from 'next/server';
import { GET as listGET, POST } from './route';
import { GET as idGET, PATCH, DELETE } from './[id]/route';
import { TECHNICIAN_CACHE_TAG } from '@/lib/api';

const { adminRoute, adminIdRoute, revalidateTag } = vi.hoisted(() => ({
  adminRoute: vi.fn(),
  adminIdRoute: vi.fn(),
  revalidateTag: vi.fn(),
}));

vi.mock('@/lib/admin-bff', () => ({ adminRoute, adminIdRoute }));

vi.mock('next/cache', () => ({ revalidateTag }));

const TECH_ID = '4b6927c8-33ce-47d3-8518-88edd1bb7b92';

function mockRequest(method = 'POST'): NextRequest {
  return {
    method,
    nextUrl: { search: '' },
    cookies: { get: () => undefined },
    headers: new Headers(),
    text: async () => '{}',
  } as unknown as NextRequest;
}

function paramsFor(id: string) {
  return { params: Promise.resolve({ id }) };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('admin technician writes invalidate the public technician cache', () => {
  it('revalidates the technician tag after a successful create (POST)', async () => {
    adminRoute.mockResolvedValue({ ok: true, status: 201 });
    const res = await POST(mockRequest('POST'));
    expect(res).toEqual({ ok: true, status: 201 });
    expect(revalidateTag).toHaveBeenCalledTimes(1);
    expect(revalidateTag).toHaveBeenCalledWith(TECHNICIAN_CACHE_TAG);
  });

  it('revalidates the technician tag after a successful update (PATCH)', async () => {
    adminIdRoute.mockResolvedValue({ ok: true, status: 200 });
    const res = await PATCH(mockRequest('PATCH'), paramsFor(TECH_ID));
    expect(res).toEqual({ ok: true, status: 200 });
    expect(revalidateTag).toHaveBeenCalledTimes(1);
    expect(revalidateTag).toHaveBeenCalledWith(TECHNICIAN_CACHE_TAG);
  });

  it('revalidates the technician tag after a successful delete (DELETE)', async () => {
    adminIdRoute.mockResolvedValue({ ok: true, status: 200 });
    const res = await DELETE(mockRequest('DELETE'), paramsFor(TECH_ID));
    expect(res).toEqual({ ok: true, status: 200 });
    expect(revalidateTag).toHaveBeenCalledTimes(1);
    expect(revalidateTag).toHaveBeenCalledWith(TECHNICIAN_CACHE_TAG);
  });

  it('does not revalidate when the create is rejected with 422', async () => {
    adminRoute.mockResolvedValue({ ok: false, status: 422 });
    const res = await POST(mockRequest('POST'));
    expect(res.status).toBe(422);
    expect(revalidateTag).not.toHaveBeenCalled();
  });

  it('does not revalidate when the update is rejected with 422', async () => {
    adminIdRoute.mockResolvedValue({ ok: false, status: 422 });
    const res = await PATCH(mockRequest('PATCH'), paramsFor(TECH_ID));
    expect(res.status).toBe(422);
    expect(revalidateTag).not.toHaveBeenCalled();
  });

  it('does not revalidate on read-only GET list/detail requests', async () => {
    adminRoute.mockResolvedValue({ ok: true, status: 200 });
    adminIdRoute.mockResolvedValue({ ok: true, status: 200 });
    await listGET(mockRequest('GET'));
    await idGET(mockRequest('GET'), paramsFor(TECH_ID));
    expect(revalidateTag).not.toHaveBeenCalled();
  });
});
