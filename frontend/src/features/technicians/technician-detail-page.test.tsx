import { describe, expect, it, vi, afterEach } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import TechnicianDetailPage from '@/app/[locale]/(public)/technicians/[id]/page';

const TECH_ID = '4b6927c8-33ce-47d3-8518-88edd1bb7b92';
const UPDATED_BIO = 'Updated biography after admin edit';
const VALID_IMG = 'https://images.unsplash.com/photo-ok.jpg';

const { mockGetTechnician } = vi.hoisted(() => ({
  mockGetTechnician: vi.fn(),
}));

vi.mock('@/lib/api', () => ({ getTechnician: mockGetTechnician }));
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
    <img src={typeof src === 'string' ? src : ''} alt={typeof alt === 'string' ? alt : ''} {...props} />
  ),
}));

const technician = {
  id: TECH_ID,
  name: 'Hassan Ouazzani',
  slug: 'hassan-ouazzani',
  phone: '+212612345680',
  whatsapp: '+212612345680',
  rating: 4.5,
  review_count: 12,
  years_exp: 15,
  service_area: 'Marrakech',
  photo_url: VALID_IMG,
  working_hours: { lundi: '9:00 - 18:00' },
  languages: ['Arabic', 'French'],
  translations: [{ locale: 'en', bio: UPDATED_BIO }],
  media: [{ url: VALID_IMG, caption: 'Gallery', media_type: 'image', sort_order: 0 }],
  services: [],
};

describe('public technician detail page renders the data returned by the API', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('shows the updated biography, name, photo and media after an admin edit', async () => {
    mockGetTechnician.mockResolvedValue({ success: true, data: technician });

    const element = await TechnicianDetailPage({ params: Promise.resolve({ locale: 'en', id: TECH_ID }) });
    const html = await renderToStaticMarkup(element);

    expect(mockGetTechnician).toHaveBeenCalledWith(TECH_ID);
    expect(html).toContain('Hassan Ouazzani');
    expect(html).toContain(UPDATED_BIO);
    expect(html).toContain(VALID_IMG);
  });
});
