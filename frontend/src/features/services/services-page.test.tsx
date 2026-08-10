import { describe, expect, it, vi, afterEach } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import ServicesPage from '@/app/[locale]/(public)/services/page';

const { mockGetServices } = vi.hoisted(() => ({
  mockGetServices: vi.fn(),
}));

vi.mock('@/lib/api', () => ({ getServices: mockGetServices }));
vi.mock('@/components/shared/service-card', () => ({
  ServiceCard: ({ service }: { service: { slug: string } }) => (
    <div data-testid="service-card">{service.slug}</div>
  ),
}));
vi.mock('next-intl/server', () => ({
  setRequestLocale: vi.fn(),
  getTranslations: vi.fn(async () => {
    const t = ((key: string) => key) as ((key: string) => string) & { has: (key: string) => boolean };
    t.has = () => true;
    return t;
  }),
}));

const services = [
  { id: 'a', slug: 'washing-machines', icon: 'shirt', sort_order: 7, translations: [] },
  { id: 'b', slug: 'electrician', icon: 'zap', sort_order: 9, translations: [] },
  { id: 'c', slug: 'cctv-surveillance', icon: 'camera', sort_order: 10, translations: [] },
];

describe('public services list page renders every service from the API', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('shows a card for each new service alongside the existing ones', async () => {
    mockGetServices.mockResolvedValue({ success: true, data: services });

    const element = await ServicesPage({ params: Promise.resolve({ locale: 'en' }) });
    const html = await renderToStaticMarkup(element);

    expect(html).toContain('washing-machines');
    expect(html).toContain('electrician');
    expect(html).toContain('cctv-surveillance');
  });
});
