import { describe, expect, it, vi, afterEach } from 'vitest';
import {
  getTechnicians,
  getTechnician,
  TECHNICIAN_CACHE_TAG,
  getServices,
  getService,
  SERVICE_CACHE_TAG,
} from '@/lib/api';

describe('public technician fetches are tagged for on-demand revalidation', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('getTechnicians caches for 3600s with the technicians tag', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, data: [] }),
    });
    vi.stubGlobal('fetch', fetchMock);

    await getTechnicians();

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toContain('/api/v1/technicians');
    expect(init.next).toEqual({ revalidate: 3600, tags: [TECHNICIAN_CACHE_TAG] });
  });

  it('getTechnicians keeps the tag when filtering by service', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, data: [] }),
    });
    vi.stubGlobal('fetch', fetchMock);

    await getTechnicians('washing-machines');

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toContain('/api/v1/technicians?service=washing-machines');
    expect(init.next.tags).toEqual([TECHNICIAN_CACHE_TAG]);
  });

  it('getTechnician caches for 3600s with the technicians tag', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, data: { id: 'abc' } }),
    });
    vi.stubGlobal('fetch', fetchMock);

    await getTechnician('abc');

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toContain('/api/v1/technicians/abc');
    expect(init.next).toEqual({ revalidate: 3600, tags: [TECHNICIAN_CACHE_TAG] });
  });
});

describe('public service fetches are tagged for on-demand revalidation', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('getServices caches for 3600s with the services tag', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, data: [] }),
    });
    vi.stubGlobal('fetch', fetchMock);

    await getServices();

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toContain('/api/v1/services');
    expect(init.next).toEqual({ revalidate: 3600, tags: [SERVICE_CACHE_TAG] });
  });

  it('getService caches for 3600s with the services tag', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, data: { slug: 'washing-machines' } }),
    });
    vi.stubGlobal('fetch', fetchMock);

    await getService('washing-machines');

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toContain('/api/v1/services/washing-machines');
    expect(init.next).toEqual({ revalidate: 3600, tags: [SERVICE_CACHE_TAG] });
  });
});
