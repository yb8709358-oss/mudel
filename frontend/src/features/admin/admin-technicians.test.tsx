// @vitest-environment jsdom
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode, SelectHTMLAttributes } from 'react';
import { AdminTechnicians } from '@/features/admin/admin-technicians';

const VALID_IMG = 'https://images.unsplash.com/photo-ok.jpg';
const VALID_IMG_2 = 'https://abc123.supabase.co/storage/v1/object/public/media/b.jpg';
const LEGACY_INVALID_IMG = 'https://somosfanaticos.fans/legacy.png';
const NEW_INVALID_IMG = 'https://evil.example.com/new.png';
const TECH_ID = '4b6927c8-33ce-47d3-8518-88edd1bb7b92';

const { mocks, mockShowToast } = vi.hoisted(() => ({
  mocks: {
    getTechnicians: vi.fn(),
    getServices: vi.fn(),
    getDistricts: vi.fn(),
    updateTechnician: vi.fn(),
    createTechnician: vi.fn(),
    deleteTechnician: vi.fn(),
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
  getTechnicians: mocks.getTechnicians,
  getServices: mocks.getServices,
  getDistricts: mocks.getDistricts,
  createTechnician: mocks.createTechnician,
  updateTechnician: mocks.updateTechnician,
  deleteTechnician: mocks.deleteTechnician,
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
  AdminDrawer: ({
    open,
    title,
    description,
    children,
    footer,
  }: {
    open: boolean;
    title?: ReactNode;
    description?: ReactNode;
    children?: ReactNode;
    footer?: ReactNode;
  }) =>
    open ? (
      <div data-testid="drawer">
        <div>{title}</div>
        {description ? <div>{description}</div> : null}
        {children}
        {footer ? <div>{footer}</div> : null}
      </div>
    ) : null,
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

function makeTechnician(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: TECH_ID,
    name: 'Ahmed Benali',
    slug: 'ahmed-benali',
    phone: '0612345678',
    whatsapp: null,
    email: null,
    photo_url: null,
    rating: 4.5,
    review_count: 10,
    service_area: null,
    working_hours: null,
    languages: null,
    years_exp: 5,
    is_featured: false,
    is_available: true,
    is_active: true,
    sort_order: 0,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    translations: [],
    media: [],
    services: [],
    districts: [],
    ...overrides,
  };
}

async function openEditAndChangeName(nextName: string) {
  const editButtons = await screen.findAllByLabelText('edit');
  fireEvent.click(editButtons[0]);
  fireEvent.change(screen.getByLabelText('technicians_name'), { target: { value: nextName } });
}

async function save() {
  fireEvent.click(screen.getByText('save'));
  await waitFor(() => {
    expect(mocks.updateTechnician).toHaveBeenCalledTimes(1);
  });
  return mocks.updateTechnician.mock.calls[0] as [string, Record<string, unknown>];
}

beforeEach(() => {
  for (const mock of Object.values(mocks)) mock.mockReset();
  mockShowToast.mockReset();
  mocks.getServices.mockResolvedValue({ data: [] });
  mocks.getDistricts.mockResolvedValue({ data: [] });
  mocks.updateTechnician.mockResolvedValue({ success: true, data: makeTechnician() });
});

afterEach(() => {
  cleanup();
});

describe('AdminTechnicians legacy image sanitization', () => {
  it('sends a valid photo_url unchanged when editing another field', async () => {
    mocks.getTechnicians.mockResolvedValue({
      data: [makeTechnician({ photo_url: VALID_IMG })],
      meta: { total: 1, limit: 20, offset: 0 },
    });
    render(<AdminTechnicians />);
    await openEditAndChangeName('Ahmed Benali Modifié');
    const [, payload] = await save();
    expect(payload.photo_url).toBe(VALID_IMG);
    expect(payload.name).toBe('Ahmed Benali Modifié');
  });

  it('does not send an unchanged legacy invalid photo_url, so the name edit still succeeds', async () => {
    mocks.getTechnicians.mockResolvedValue({
      data: [makeTechnician({ photo_url: LEGACY_INVALID_IMG })],
      meta: { total: 1, limit: 20, offset: 0 },
    });
    render(<AdminTechnicians />);
    await openEditAndChangeName('Ahmed Benali Modifié');
    expect(screen.getByText('technicians_photo_invalid')).toBeTruthy();
    const [, payload] = await save();
    expect(payload).not.toHaveProperty('photo_url');
    expect(payload.name).toBe('Ahmed Benali Modifié');
  });

  it('filters legacy invalid media URLs out of the editable form and payload', async () => {
    mocks.getTechnicians.mockResolvedValue({
      data: [
        makeTechnician({
          media: [
            { url: VALID_IMG, media_type: 'image', sort_order: 0 },
            { url: LEGACY_INVALID_IMG, media_type: 'image', sort_order: 1 },
          ],
        }),
      ],
      meta: { total: 1, limit: 20, offset: 0 },
    });
    render(<AdminTechnicians />);
    await openEditAndChangeName('Ahmed Benali Modifié');
    const [, payload] = await save();
    expect(payload.media).toEqual([{ url: VALID_IMG, media_type: 'image', sort_order: 0 }]);
  });

  it('keeps valid media in the payload', async () => {
    mocks.getTechnicians.mockResolvedValue({
      data: [
        makeTechnician({
          media: [
            { url: VALID_IMG, media_type: 'image', sort_order: 0 },
            { url: VALID_IMG_2, media_type: 'image', sort_order: 1 },
          ],
        }),
      ],
      meta: { total: 1, limit: 20, offset: 0 },
    });
    render(<AdminTechnicians />);
    await openEditAndChangeName('Ahmed Benali Modifié');
    const [, payload] = await save();
    expect(payload.media).toEqual([
      { url: VALID_IMG, media_type: 'image', sort_order: 0 },
      { url: VALID_IMG_2, media_type: 'image', sort_order: 1 },
    ]);
  });

  it('clears a legacy invalid photo_url to null when the admin clicks remove', async () => {
    mocks.getTechnicians.mockResolvedValue({
      data: [makeTechnician({ photo_url: LEGACY_INVALID_IMG })],
      meta: { total: 1, limit: 20, offset: 0 },
    });
    render(<AdminTechnicians />);
    await openEditAndChangeName('Ahmed Benali Modifié');
    fireEvent.click(screen.getByText('technicians_remove_photo'));
    const [, payload] = await save();
    expect(payload.photo_url).toBeNull();
  });

  it('rejects a newly entered invalid photo URL before sending the request', async () => {
    mocks.getTechnicians.mockResolvedValue({
      data: [makeTechnician({ photo_url: VALID_IMG })],
      meta: { total: 1, limit: 20, offset: 0 },
    });
    render(<AdminTechnicians />);
    const editButtons = await screen.findAllByLabelText('edit');
    fireEvent.click(editButtons[0]);
    fireEvent.change(screen.getByLabelText('technicians_name'), { target: { value: 'Rename' } });
    fireEvent.change(screen.getByLabelText('technicians_photo_url'), { target: { value: NEW_INVALID_IMG } });
    fireEvent.click(screen.getByText('save'));
    await waitFor(() => expect(mockShowToast).toHaveBeenCalledWith('technicians_image_url_invalid', 'error'));
    expect(mocks.updateTechnician).not.toHaveBeenCalled();
  });

  it('rejects a newly entered invalid media URL before sending the request', async () => {
    mocks.getTechnicians.mockResolvedValue({
      data: [makeTechnician()],
      meta: { total: 1, limit: 20, offset: 0 },
    });
    render(<AdminTechnicians />);
    const editButtons = await screen.findAllByLabelText('edit');
    fireEvent.click(editButtons[0]);
    fireEvent.click(screen.getByText('technicians_add_media'));
    const urlInputs = screen.getAllByPlaceholderText('https://...');
    fireEvent.change(urlInputs[urlInputs.length - 1], { target: { value: NEW_INVALID_IMG } });
    fireEvent.click(screen.getByText('save'));
    await waitFor(() => expect(mockShowToast).toHaveBeenCalledWith('technicians_image_url_invalid', 'error'));
    expect(mocks.updateTechnician).not.toHaveBeenCalled();
  });

  it('creates a technician with a clean form that submits no image fields', async () => {
    mocks.createTechnician.mockResolvedValue({ data: makeTechnician() });
    mocks.getTechnicians.mockResolvedValue({
      data: [],
      meta: { total: 0, limit: 20, offset: 0 },
    });
    render(<AdminTechnicians />);
    fireEvent.click(screen.getByText('technicians_add'));
    fireEvent.change(screen.getByLabelText('technicians_name'), { target: { value: 'Nouveau' } });
    fireEvent.change(screen.getByLabelText('technicians_slug'), { target: { value: 'nouveau' } });
    fireEvent.change(screen.getByLabelText('technicians_phone'), { target: { value: '0612345678' } });
    fireEvent.click(screen.getByText('save'));
    await waitFor(() => expect(mocks.createTechnician).toHaveBeenCalledTimes(1));
    const payload = mocks.createTechnician.mock.calls[0][0] as Record<string, unknown>;
    expect(payload.photo_url ?? null).toBeNull();
    expect(payload.media ?? []).toEqual([]);
  });

  it('accepts a newly entered valid Unsplash photo URL on edit', async () => {
    mocks.getTechnicians.mockResolvedValue({
      data: [makeTechnician({ photo_url: LEGACY_INVALID_IMG })],
      meta: { total: 1, limit: 20, offset: 0 },
    });
    render(<AdminTechnicians />);
    const editButtons = await screen.findAllByLabelText('edit');
    fireEvent.click(editButtons[0]);
    fireEvent.change(screen.getByLabelText('technicians_photo_url'), { target: { value: VALID_IMG } });
    fireEvent.click(screen.getByText('save'));
    await waitFor(() => expect(mocks.updateTechnician).toHaveBeenCalledTimes(1));
    const payload = mocks.updateTechnician.mock.calls[0][1] as Record<string, unknown>;
    expect(payload.photo_url).toBe(VALID_IMG);
  });

  it('accepts a newly entered valid Supabase media URL on edit', async () => {
    mocks.getTechnicians.mockResolvedValue({
      data: [makeTechnician()],
      meta: { total: 1, limit: 20, offset: 0 },
    });
    render(<AdminTechnicians />);
    const editButtons = await screen.findAllByLabelText('edit');
    fireEvent.click(editButtons[0]);
    fireEvent.click(screen.getByText('technicians_add_media'));
    const urlInputs = screen.getAllByPlaceholderText('https://...');
    fireEvent.change(urlInputs[urlInputs.length - 1], { target: { value: VALID_IMG_2 } });
    fireEvent.click(screen.getByText('save'));
    await waitFor(() => expect(mocks.updateTechnician).toHaveBeenCalledTimes(1));
    const payload = mocks.updateTechnician.mock.calls[0][1] as Record<string, unknown>;
    expect(payload.media).toEqual([{ url: VALID_IMG_2, media_type: 'image', sort_order: 0 }]);
  });

  it('resets photo and media state when switching from edit to the new form', async () => {
    mocks.getTechnicians.mockResolvedValue({
      data: [
        makeTechnician({ id: 'legacy-id', photo_url: LEGACY_INVALID_IMG, media: [{ url: LEGACY_INVALID_IMG, media_type: 'image', sort_order: 0 }] }),
        makeTechnician({ id: 'other-id' }),
      ],
      meta: { total: 2, limit: 20, offset: 0 },
    });
    render(<AdminTechnicians />);
    const editButtons = await screen.findAllByLabelText('edit');
    fireEvent.click(editButtons[0]);
    expect((screen.getByLabelText('technicians_photo_url') as HTMLInputElement).value).toBe(LEGACY_INVALID_IMG);
    fireEvent.click(screen.getByText('cancel'));
    fireEvent.click(screen.getByText('technicians_add'));
    expect((screen.getByLabelText('technicians_photo_url') as HTMLInputElement).value).toBe('');
    expect(screen.queryByLabelText('remove')).toBeNull();
  });

  it('loads only the selected technician when switching from new to edit', async () => {
    mocks.getTechnicians.mockResolvedValue({
      data: [
        makeTechnician({ id: 'first-id' }),
        makeTechnician({ id: 'second-id', photo_url: VALID_IMG, media: [{ url: VALID_IMG_2, media_type: 'image', sort_order: 0 }] }),
      ],
      meta: { total: 2, limit: 20, offset: 0 },
    });
    render(<AdminTechnicians />);
    fireEvent.click(screen.getByText('technicians_add'));
    fireEvent.change(screen.getByLabelText('technicians_name'), { target: { value: 'Draft' } });
    fireEvent.click(screen.getByText('cancel'));
    const editButtons = await screen.findAllByLabelText('edit');
    fireEvent.click(editButtons[1]);
    expect((screen.getByLabelText('technicians_name') as HTMLInputElement).value).toBe('Ahmed Benali');
    expect((screen.getByLabelText('technicians_photo_url') as HTMLInputElement).value).toBe(VALID_IMG);
    const urlInputs = screen.getAllByPlaceholderText('https://...') as HTMLInputElement[];
    expect(urlInputs).toHaveLength(2);
    expect(urlInputs.some((el) => el.value === VALID_IMG_2)).toBe(true);
  });

  it('does not send an unchanged legacy invalid email, so the name edit still succeeds', async () => {
    mocks.getTechnicians.mockResolvedValue({
      data: [makeTechnician({ email: 'not-an-email' })],
      meta: { total: 1, limit: 20, offset: 0 },
    });
    render(<AdminTechnicians />);
    await openEditAndChangeName('Ahmed Benali Modifié');
    const [, payload] = await save();
    expect(payload).not.toHaveProperty('email');
    expect(payload.name).toBe('Ahmed Benali Modifié');
  });

  it('sends a valid unchanged email so the edit still persists it', async () => {
    mocks.getTechnicians.mockResolvedValue({
      data: [makeTechnician({ email: 'ahmed@example.com' })],
      meta: { total: 1, limit: 20, offset: 0 },
    });
    render(<AdminTechnicians />);
    await openEditAndChangeName('Ahmed Benali Modifié');
    const [, payload] = await save();
    expect(payload.email).toBe('ahmed@example.com');
  });

  it('does not send an unchanged legacy years_exp outside 0-100, so the name edit still succeeds', async () => {
    mocks.getTechnicians.mockResolvedValue({
      data: [makeTechnician({ years_exp: 150 })],
      meta: { total: 1, limit: 20, offset: 0 },
    });
    render(<AdminTechnicians />);
    await openEditAndChangeName('Ahmed Benali Modifié');
    const [, payload] = await save();
    expect(payload).not.toHaveProperty('years_exp');
    expect(payload.name).toBe('Ahmed Benali Modifié');
  });

  it('sends a newly entered invalid email so the backend still rejects it with 422', async () => {
    mocks.getTechnicians.mockResolvedValue({
      data: [makeTechnician()],
      meta: { total: 1, limit: 20, offset: 0 },
    });
    render(<AdminTechnicians />);
    const editButtons = await screen.findAllByLabelText('edit');
    fireEvent.click(editButtons[0]);
    fireEvent.change(screen.getByLabelText('technicians_name'), { target: { value: 'Rename' } });
    fireEvent.change(screen.getByLabelText('technicians_email'), { target: { value: 'not-an-email' } });
    const [, payload] = await save();
    expect(payload.email).toBe('not-an-email');
  });
});
