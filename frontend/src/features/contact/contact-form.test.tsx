// @vitest-environment jsdom
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { ContactForm } from '@/features/contact/contact-form';

const SERVICE_ID = '11111111-1111-1111-1111-111111111111';

const services = [
  {
    id: SERVICE_ID,
    slug: 'plomberie',
    icon: 'wrench',
    sort_order: 0,
    translations: [
      { locale: 'fr', name: 'Plomberie' },
      { locale: 'en', name: 'Plumbing' },
      { locale: 'ar', name: 'السباكة' },
    ],
  },
];

const { mockLocale, mockGetServices, mockSubmitContact } = vi.hoisted(() => ({
  mockLocale: { value: 'fr' },
  mockGetServices: vi.fn(),
  mockSubmitContact: vi.fn(),
}));

vi.mock('next-intl', () => ({
  useLocale: () => mockLocale.value,
  useTranslations: () => (key: string) => key,
}));

vi.mock('@/i18n/navigation', () => ({
  Link: ({ href, children }: { href: string; children: React.ReactNode }) => (
    <a href={href}>{children}</a>
  ),
}));

vi.mock('@/lib/api', () => ({
  getServices: mockGetServices,
  submitContact: mockSubmitContact,
}));

async function fillAndSubmit() {
  await screen.findByText('Plomberie');
  fireEvent.change(screen.getByLabelText('service'), { target: { value: SERVICE_ID } });
  fireEvent.change(screen.getByLabelText('name'), { target: { value: 'Karim Test' } });
  fireEvent.change(screen.getByLabelText('phone'), { target: { value: '+212612345678' } });
  fireEvent.change(screen.getByLabelText('district'), { target: { value: 'Gueliz' } });
  fireEvent.click(screen.getByText('submit'));
}

describe('ContactForm service selector', () => {
  beforeEach(() => {
    mockLocale.value = 'fr';
    mockGetServices.mockReset();
    mockSubmitContact.mockReset();
    mockGetServices.mockResolvedValue({ data: services });
    mockSubmitContact.mockResolvedValue({
      data: {
        id: 'contact-1',
        message: 'Message sent successfully',
        request_token: 'tok-123',
        request_token_expires_at: '2026-08-14T00:00:00Z',
      },
    });
  });

  it('renders the service selector from the real catalogue', async () => {
    render(<ContactForm />);
    expect(screen.getByLabelText('service')).toBeTruthy();
    await screen.findByText('Plomberie');
    cleanup();
  });

  it('submits the selected real service_id', async () => {
    render(<ContactForm />);
    await fillAndSubmit();
    await waitFor(() => {
      expect(mockSubmitContact).toHaveBeenCalledTimes(1);
    });
    const payload = mockSubmitContact.mock.calls[0][0];
    expect(payload.service_id).toBe(SERVICE_ID);
    cleanup();
  });

  it('does not submit when no service is selected', async () => {
    render(<ContactForm />);
    await screen.findByText('Plomberie');
    fireEvent.change(screen.getByLabelText('name'), { target: { value: 'Karim Test' } });
    fireEvent.change(screen.getByLabelText('phone'), { target: { value: '+212612345678' } });
    fireEvent.change(screen.getByLabelText('district'), { target: { value: 'Gueliz' } });
    fireEvent.click(screen.getByText('submit'));
    expect(mockSubmitContact).not.toHaveBeenCalled();
    cleanup();
  });

  it('shows a retry state when services fail to load', async () => {
    mockGetServices.mockRejectedValue(new Error('boom'));
    render(<ContactForm />);
    await screen.findByText('services_error');
    expect(screen.getByText('retry')).toBeTruthy();
    cleanup();
  });

  it('exposes request_token on success and links the CTA to the request page', async () => {
    render(<ContactForm />);
    await fillAndSubmit();
    await waitFor(() => {
      expect(screen.getByRole('link').getAttribute('href')).toBe('/request/tok-123');
    });
    cleanup();
  });

  it('localizes service names per locale', async () => {
    mockLocale.value = 'en';
    render(<ContactForm />);
    await screen.findByText('Plumbing');
    cleanup();

    mockLocale.value = 'ar';
    render(<ContactForm />);
    await screen.findByText('السباكة');
    cleanup();
  });

  it('shows a mapped message when the service is no longer available', async () => {
    mockSubmitContact.mockRejectedValue({ code: 'SERVICE_NOT_FOUND' });
    render(<ContactForm />);
    await fillAndSubmit();
    await screen.findByText('error_service_not_found');
    cleanup();
  });

  it('shows a mapped message when rate limited', async () => {
    mockSubmitContact.mockRejectedValue({ code: 'RATE_LIMIT_EXCEEDED' });
    render(<ContactForm />);
    await fillAndSubmit();
    await screen.findByText('error_rate_limited');
    cleanup();
  });

  it('shows a mapped message when a service is required', async () => {
    mockSubmitContact.mockRejectedValue({ code: 'CONTACT_SERVICE_REQUIRED' });
    render(<ContactForm />);
    await fillAndSubmit();
    await screen.findByText('error_service_required');
    cleanup();
  });

  it('falls back to the generic error message for unknown errors', async () => {
    mockSubmitContact.mockRejectedValue({ code: 'UNKNOWN_ERROR' });
    render(<ContactForm />);
    await fillAndSubmit();
    await screen.findByText('error');
    cleanup();
  });

  it('falls back to the generic error message for non-API errors', async () => {
    mockSubmitContact.mockRejectedValue(new Error('network down'));
    render(<ContactForm />);
    await fillAndSubmit();
    await screen.findByText('error');
    cleanup();
  });
});
