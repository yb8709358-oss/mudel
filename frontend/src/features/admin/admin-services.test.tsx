// @vitest-environment jsdom
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode, SelectHTMLAttributes } from 'react';
import { AdminServices } from '@/features/admin/admin-services';

const VALID_IMG = 'https://vrllobkwnvqxzeoosajx.supabase.co/storage/v1/object/public/request-images/photo.jpg';
const VALID_IMG_2 = 'https://images.unsplash.com/photo-ok.jpg';
const INVALID_IMG = 'https://evil.example.com/new.png';
const SERVICE_ID = '9ee4e52e-d178-4f4a-8f78-328bda081f8d';

const { mocks, mockShowToast } = vi.hoisted(() => ({
  mocks: {
    getServices: vi.fn(),
    getService: vi.fn(),
    createService: vi.fn(),
    updateService: vi.fn(),
    deleteService: vi.fn(),
  },
  mockShowToast: vi.fn(),
}));

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}));

vi.mock('@/lib/admin-api', () => ({
  AdminClientError: class AdminClientError extends Error {
    status: number;
    constructor(message: string, status: number) {
      super(message);
      this.status = status;
    }
  },
  getServices: mocks.getServices,
  getService: mocks.getService,
  createService: mocks.createService,
  updateService: mocks.updateService,
  deleteService: mocks.deleteService,
}));

vi.mock('@/features/admin/components/admin-toast', () => ({
  useToast: () => ({ showToast: mockShowToast }),
}));

vi.mock('@/features/admin/components/admin-ui', () => ({
  AdminBadge: ({ children }: { children: ReactNode }) => <span>{children}</span>,
  AdminButton: ({
    children,
    variant: _variant,
    ...props
  }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: string }) => (
    <button type="button" {...props}>
      {children}
    </button>
  ),
  AdminConfirmDialog: () => null,
  AdminEmptyState: () => null,
  AdminFilterBar: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  AdminIconButton: ({ children, ...props }: ButtonHTMLAttributes<HTMLButtonElement>) => (
    <button type="button" {...props}>
      {children}
    </button>
  ),
  AdminInput: (props: InputHTMLAttributes<HTMLInputElement>) => <input {...props} />,
  AdminLabel: ({ children, htmlFor }: { children: ReactNode; htmlFor?: string }) => (
    <label htmlFor={htmlFor}>{children}</label>
  ),
  AdminModal: ({
    open,
    title,
    children,
    footer,
  }: {
    open: boolean;
    title?: ReactNode;
    children?: ReactNode;
    footer?: ReactNode;
  }) =>
    open ? (
      <div data-testid="modal">
        <div>{title}</div>
        {children}
        {footer ? <div>{footer}</div> : null}
      </div>
    ) : null,
  AdminPageHeader: ({ actions }: { actions?: ReactNode }) => <div>{actions}</div>,
  AdminPaginationControls: () => null,
  AdminSection: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  AdminSelect: (props: SelectHTMLAttributes<HTMLSelectElement>) => <select {...props} />,
  AdminSkeleton: () => null,
  AdminTable: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  AdminTableCell: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  AdminTableHeader: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  AdminTableRow: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  AdminToolbar: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

function makeService(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: SERVICE_ID,
    slug: 'air-conditioner-installation',
    icon: 'snowflake',
    sort_order: 1,
    is_active: true,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    translations: [
      { locale: 'fr', name: 'Installation de Climatiseur', description: 'Description FR' },
      { locale: 'en', name: 'Air Conditioner Installation', description: 'Description EN' },
    ],
    media: [{ url: VALID_IMG, media_type: 'image', sort_order: 0 }],
    ...overrides,
  };
}

async function openEditService() {
  const editButtons = await screen.findAllByLabelText('edit');
  fireEvent.click(editButtons[0]);
  await waitFor(() => {
    expect(screen.getByText('save')).toBeTruthy();
  });
}

function mediaInputs() {
  return screen.getAllByPlaceholderText('https://...') as HTMLInputElement[];
}

function setMediaValue(index: number, value: string) {
  fireEvent.change(mediaInputs()[index], { target: { value } });
}

async function save() {
  fireEvent.click(screen.getByText('save'));
  await waitFor(() => {
    expect(mocks.updateService).toHaveBeenCalled();
  });
  return mocks.updateService.mock.calls[0] as [string, Record<string, unknown>];
}

beforeEach(() => {
  for (const mock of Object.values(mocks)) mock.mockReset();
  mockShowToast.mockReset();
  mocks.getService.mockResolvedValue({ success: true, data: makeService() });
  mocks.updateService.mockResolvedValue({ success: true, data: makeService() });
  mocks.createService.mockResolvedValue({ success: true, data: makeService() });
});

afterEach(() => {
  cleanup();
});

describe('AdminServices media round-trip', () => {
  it('populates the stored media URL into the edit form when reopening a service', async () => {
    mocks.getServices.mockResolvedValue({
      data: [makeService()],
      meta: { total: 1, limit: 20, offset: 0 },
    });
    render(<AdminServices />);
    await openEditService();
    const inputs = mediaInputs();
    expect(inputs).toHaveLength(1);
    expect(inputs[0].value).toBe(VALID_IMG);
  });

  it('refreshes the service from the backend when opening the editor, so stored media appears even if the list item is stale', async () => {
    mocks.getServices.mockResolvedValue({
      data: [makeService({ media: [] })],
      meta: { total: 1, limit: 20, offset: 0 },
    });
    mocks.getService.mockResolvedValue({ success: true, data: makeService() });
    render(<AdminServices />);
    await openEditService();
    const inputs = mediaInputs();
    expect(inputs).toHaveLength(1);
    expect(inputs[0].value).toBe(VALID_IMG);
  });

  it('falls back to the row data when the fresh fetch fails', async () => {
    mocks.getServices.mockResolvedValue({
      data: [makeService()],
      meta: { total: 1, limit: 20, offset: 0 },
    });
    mocks.getService.mockRejectedValue(new Error('network'));
    render(<AdminServices />);
    await openEditService();
    expect(mediaInputs()[0].value).toBe(VALID_IMG);
  });

  it('preserves existing media on a name/description-only edit', async () => {
    mocks.getServices.mockResolvedValue({
      data: [makeService()],
      meta: { total: 1, limit: 20, offset: 0 },
    });
    render(<AdminServices />);
    await openEditService();
    fireEvent.change(screen.getByLabelText('services_slug'), { target: { value: 'air-conditioner-installation' } });
    const [, payload] = await save();
    expect(payload.media).toEqual([{ url: VALID_IMG, media_type: 'image', sort_order: 0 }]);
  });

  it('adds a new media URL to the form and payload', async () => {
    mocks.getServices.mockResolvedValue({
      data: [makeService()],
      meta: { total: 1, limit: 20, offset: 0 },
    });
    render(<AdminServices />);
    await openEditService();
    fireEvent.click(screen.getByText('services_add_media'));
    const inputs = mediaInputs();
    expect(inputs).toHaveLength(2);
    fireEvent.change(inputs[1], { target: { value: VALID_IMG_2 } });
    const [, payload] = await save();
    expect(payload.media).toEqual([
      { url: VALID_IMG, media_type: 'image', sort_order: 0 },
      { url: VALID_IMG_2, media_type: 'image', sort_order: 1 },
    ]);
  });

  it('removes a media URL from the form and payload', async () => {
    const twoMedia = makeService({
      media: [VALID_IMG, VALID_IMG_2].map((url, i) => ({ url, media_type: 'image', sort_order: i })),
    });
    mocks.getServices.mockResolvedValue({
      data: [twoMedia],
      meta: { total: 1, limit: 20, offset: 0 },
    });
    mocks.getService.mockResolvedValue({ success: true, data: twoMedia });
    render(<AdminServices />);
    await openEditService();
    expect(mediaInputs()).toHaveLength(2);
    fireEvent.click(screen.getAllByLabelText('remove')[0]);
    expect(mediaInputs()).toHaveLength(1);
    const [, payload] = await save();
    expect(payload.media).toEqual([{ url: VALID_IMG_2, media_type: 'image', sort_order: 0 }]);
  });

  it('does not send empty media rows to the backend', async () => {
    mocks.getServices.mockResolvedValue({
      data: [makeService()],
      meta: { total: 1, limit: 20, offset: 0 },
    });
    render(<AdminServices />);
    await openEditService();
    fireEvent.click(screen.getByText('services_add_media'));
    fireEvent.change(mediaInputs()[1], { target: { value: '   ' } });
    const [, payload] = await save();
    expect(payload.media).toEqual([{ url: VALID_IMG, media_type: 'image', sort_order: 0 }]);
  });
});

describe('AdminServices invalid new media URL', () => {
  it('surfaces the backend 422 validation error for a newly entered invalid media URL', async () => {
    mocks.getServices.mockResolvedValue({
      data: [makeService()],
      meta: { total: 1, limit: 20, offset: 0 },
    });
    mocks.updateService.mockRejectedValue(
      new (class extends Error {
        status = 422;
      })('url must be an HTTPS image URL on an allowed host (images.unsplash.com or *.supabase.co)'),
    );
    render(<AdminServices />);
    await openEditService();
    fireEvent.click(screen.getByText('services_add_media'));
    setMediaValue(1, INVALID_IMG);
    fireEvent.click(screen.getByText('save'));
    await waitFor(() => {
      expect(mocks.updateService).toHaveBeenCalledTimes(1);
    });
    expect(mockShowToast).toHaveBeenCalledWith('action_failed', 'error');
  });
});
