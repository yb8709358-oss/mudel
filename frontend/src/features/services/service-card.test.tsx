// @vitest-environment jsdom
import { describe, expect, it, vi, afterEach, beforeEach } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { ServiceCard } from '@/components/shared/service-card';

const { mockLocale } = vi.hoisted(() => ({ mockLocale: { value: 'en' } }));

vi.mock('next-intl', () => ({
  useLocale: () => mockLocale.value,
  useTranslations: () => (key: string) => key,
}));

vi.mock('@/i18n/navigation', () => ({
  Link: ({ href, children }: { href: string; children: React.ReactNode }) => (
    <a href={href}>{children}</a>
  ),
}));

vi.mock('next/image', () => ({
  default: ({ src, alt }: { src: string; alt: string }) => <img src={src} alt={alt} />,
}));

const electrician = {
  id: 'electrician-id',
  slug: 'electrician',
  icon: 'zap',
  sort_order: 9,
  translations: [
    { locale: 'en', name: 'Electrical Services', description: 'Professional electrical services for homes and businesses.' },
    { locale: 'fr', name: 'Électricité', description: 'Services électriques professionnels.' },
    { locale: 'ar', name: 'الكهرباء', description: 'خدمات كهربائية احترافية للمنازل والشركات.' },
  ],
};

const cctv = {
  id: 'cctv-id',
  slug: 'cctv-surveillance',
  icon: 'camera',
  sort_order: 10,
  translations: [
    { locale: 'en', name: 'CCTV & Surveillance', description: 'Installation and repair of CCTV systems.' },
    { locale: 'fr', name: 'Caméras de surveillance', description: 'Installation de caméras de surveillance.' },
    { locale: 'ar', name: 'كاميرات المراقبة', description: 'تركيب وإصلاح أنظمة كاميرات المراقبة.' },
  ],
};

describe('ServiceCard renders the new catalogue services', () => {
  beforeEach(() => {
    mockLocale.value = 'en';
  });

  afterEach(() => {
    cleanup();
  });

  it('renders the electrician card in English with its slug link and icon', () => {
    render(<ServiceCard service={electrician} />);
    expect(screen.getByText('Electrical Services')).toBeTruthy();
    expect(screen.getByText('Professional electrical services for homes and businesses.')).toBeTruthy();
    expect(screen.getByText('⚡')).toBeTruthy();
    const link = screen.getByRole('link');
    expect(link.getAttribute('href')).toBe('/services/electrician');
  });

  it('renders the electrician card in French', () => {
    mockLocale.value = 'fr';
    render(<ServiceCard service={electrician} />);
    expect(screen.getByText('Électricité')).toBeTruthy();
    expect(screen.getByText('Services électriques professionnels.')).toBeTruthy();
  });

  it('renders the electrician card in Arabic', () => {
    mockLocale.value = 'ar';
    render(<ServiceCard service={electrician} />);
    expect(screen.getByText('الكهرباء')).toBeTruthy();
    expect(screen.getByText('خدمات كهربائية احترافية للمنازل والشركات.')).toBeTruthy();
  });

  it('renders the CCTV card in English with its slug link and icon', () => {
    render(<ServiceCard service={cctv} />);
    expect(screen.getByText('CCTV & Surveillance')).toBeTruthy();
    expect(screen.getByText('Installation and repair of CCTV systems.')).toBeTruthy();
    expect(screen.getByText('🎥')).toBeTruthy();
    const link = screen.getByRole('link');
    expect(link.getAttribute('href')).toBe('/services/cctv-surveillance');
  });

  it('renders the CCTV card in Arabic', () => {
    mockLocale.value = 'ar';
    render(<ServiceCard service={cctv} />);
    expect(screen.getByText('كاميرات المراقبة')).toBeTruthy();
    expect(screen.getByText('تركيب وإصلاح أنظمة كاميرات المراقبة.')).toBeTruthy();
  });
});
