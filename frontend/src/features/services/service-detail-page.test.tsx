import { describe, expect, it, vi, afterEach } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import ServiceDetailPage from '@/app/[locale]/(public)/services/[slug]/page';

const VALID_IMG = 'https://images.unsplash.com/photo-washer.jpg';
const VALID_IMG_2 = 'https://xyz.supabase.co/storage/v1/object/public/media/ac-install.jpg';
const VALID_GIF = 'https://images.unsplash.com/photo-demo.gif';
const DISALLOWED_HOST = 'https://evil.example.com/x.jpg';
const INSECURE_IMG = 'http://images.unsplash.com/photo-insecure.jpg';

const { mockGetService, mockGetTechnicians } = vi.hoisted(() => ({
  mockGetService: vi.fn(),
  mockGetTechnicians: vi.fn(),
}));

vi.mock('@/lib/api', () => ({ getService: mockGetService, getTechnicians: mockGetTechnicians }));
vi.mock('@/i18n/navigation', () => ({
  Link: ({ href, children, ...props }: Record<string, unknown>) => (
    <a href={typeof href === 'string' ? href : '#'} {...props}>
      {children as React.ReactNode}
    </a>
  ),
}));
vi.mock('next/navigation', () => ({
  notFound: vi.fn(() => {
    throw new Error('notFound() called');
  }),
}));
vi.mock('next-intl/server', () => ({
  setRequestLocale: vi.fn(),
  getTranslations: vi.fn(async () => {
    const t = ((key: string) => key) as ((key: string) => string) & { has: (key: string) => boolean };
    t.has = () => true;
    return t;
  }),
}));
vi.mock('next/image', () => ({
  default: ({ src, alt, fill: _fill, priority: _priority, sizes: _sizes, ...props }: Record<string, unknown>) => (
    <img
      src={typeof src === 'string' ? src : ''}
      alt={typeof alt === 'string' ? alt : ''}
      data-next-image="true"
      {...props}
    />
  ),
}));

function makeService(media: Array<{ url: string }>) {
  return {
    id: 'a1b2c3',
    slug: 'washing-machines',
    icon: 'washing-machine',
    sort_order: 1,
    translations: [
      {
        locale: 'en',
        name: 'Washing Machines',
        description: 'Repair and installation of washing machines.',
      },
    ],
    media,
  };
}

async function renderService(service: unknown) {
  mockGetService.mockResolvedValue({ success: true, data: service });
  mockGetTechnicians.mockResolvedValue({ success: true, data: [] });
  const element = await ServiceDetailPage({
    params: Promise.resolve({ locale: 'en', slug: 'washing-machines' }),
  });
  return renderToStaticMarkup(element);
}

describe('public service page renders the media gallery', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('shows every valid media item as an optimized image', async () => {
    const html = await renderService(makeService([{ url: VALID_IMG }, { url: VALID_IMG_2 }]));

    expect(html).toContain(VALID_IMG);
    expect(html).toContain(VALID_IMG_2);
    expect(html).toContain('media</h2>');
  });

  it('renders GIF media with a plain <img> so the animation is preserved', async () => {
    const html = await renderService(makeService([{ url: VALID_GIF }]));

    expect(html).toContain(VALID_GIF);
    expect(html).not.toContain('data-next-image');
  });

  it('renders non-GIF media with the Next.js optimized image', async () => {
    const html = await renderService(makeService([{ url: VALID_IMG }]));

    expect(html).toContain('data-next-image');
    expect(html).toContain(VALID_IMG);
  });

  it('renders no gallery when the service has no media', async () => {
    const html = await renderService(makeService([]));

    expect(html).not.toContain('media</h2>');
    expect(html).not.toContain('data-next-image');
  });

  it('drops disallowed media URLs and never renders them', async () => {
    const html = await renderService(
      makeService([{ url: VALID_IMG }, { url: DISALLOWED_HOST }, { url: INSECURE_IMG }]),
    );

    expect(html).toContain(VALID_IMG);
    expect(html).not.toContain(DISALLOWED_HOST);
    expect(html).not.toContain(INSECURE_IMG);
  });
});
