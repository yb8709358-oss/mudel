// @vitest-environment jsdom
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import ErrorPage from '@/app/[locale]/(public)/error';

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}));

vi.mock('@/i18n/navigation', () => ({
  Link: ({ href, children }: { href: string; children: React.ReactNode }) => (
    <a href={href}>{children}</a>
  ),
}));

const settingsResponse = {
  success: true,
  data: { contact_phone: '+212 6 11 22 33 44', support_phone: '+212691869602' },
};

beforeEach(() => {
  cleanup();
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue({
      ok: true,
      json: async () => settingsResponse,
    }),
  );
});

describe('public error page contact phone', () => {
  it('renders the configured contact phone from the settings endpoint', async () => {
    render(<ErrorPage reset={vi.fn()} error={Object.assign(new Error('boom'), { digest: 'x' })} />);
    const link = await screen.findByRole('link', { name: '+212 6 11 22 33 44' });
    expect(link.getAttribute('href')).toBe('tel:+212611223344');
  });
});
