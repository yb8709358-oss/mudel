'use client';

import { useCallback, useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Pencil, Plus, Power, RefreshCw, Search, Trash2 } from 'lucide-react';
import {
  AdminBadge,
  AdminButton,
  AdminConfirmDialog,
  AdminDrawer,
  AdminEmptyState,
  AdminFilterBar,
  AdminIconButton,
  AdminInput,
  AdminLabel,
  AdminPageHeader,
  AdminPaginationControls,
  AdminSection,
  AdminSelect,
  AdminSkeleton,
  AdminTable,
  AdminTableCell,
  AdminTableHeader,
  AdminTableRow,
  AdminToolbar,
} from '@/features/admin/components/admin-ui';
import { useToast } from '@/features/admin/components/admin-toast';
import {
  AdminClientError,
  createTechnician,
  deleteTechnician,
  getDistricts,
  getServices,
  getTechnicians,
  updateTechnician,
} from '@/lib/admin-api';
import { buildMediaPayload, filterAllowedImageUrls, findInvalidImageUrl, isLegacyInvalidPhotoUrl, resolvePhotoUrlPayload } from '@/lib/technician-images';
import { isValidEmail, resolveOptionalString, resolveYearsExp } from '@/lib/technician-fields';
import { isAllowedImageUrl } from '@/lib/image-urls';
import { AdminDistrict, AdminService, AdminTechnician } from '@/types/admin';

const LIMIT = 20;
const SEARCH_DEBOUNCE_MS = 300;
const LOCALES = ['fr', 'en', 'ar'] as const;

type TechnicianForm = {
  id?: string;
  name: string;
  slug: string;
  phone: string;
  whatsapp: string;
  email: string;
  photo_url: string;
  service_area: string;
  years_exp: number | '';
  sort_order: number;
  is_featured: boolean;
  is_available: boolean;
  is_active: boolean;
  languages: string;
  working_hours: string;
  translations: Record<string, { bio: string }>;
  services: { service_id: string; estimated_price_min: string; estimated_price_max: string }[];
  districts: string[];
  media: string[];
};

const EMPTY_ORIGINAL_FIELDS: { email: string; years_exp: number | null } = {
  email: '',
  years_exp: null,
};

const emptyForm = (): TechnicianForm => ({
  name: '',
  slug: '',
  phone: '',
  whatsapp: '',
  email: '',
  photo_url: '',
  service_area: '',
  years_exp: '',
  sort_order: 0,
  is_featured: false,
  is_available: true,
  is_active: true,
  languages: '',
  working_hours: '',
  translations: Object.fromEntries(LOCALES.map((l) => [l, { bio: '' }])) as TechnicianForm['translations'],
  services: [],
  districts: [],
  media: [],
});

export function AdminTechnicians() {
  const t = useTranslations('admin');
  const { showToast } = useToast();

  const [technicians, setTechnicians] = useState<AdminTechnician[]>([]);
  const [services, setServices] = useState<AdminService[]>([]);
  const [districts, setDistricts] = useState<AdminDistrict[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [search, setSearch] = useState('');
  const [appliedSearch, setAppliedSearch] = useState('');
  const [serviceFilter, setServiceFilter] = useState('');
  const [offset, setOffset] = useState(0);

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [form, setForm] = useState<TechnicianForm>(emptyForm());
  const [photoOriginal, setPhotoOriginal] = useState('');
  const [originalFields, setOriginalFields] = useState(EMPTY_ORIGINAL_FIELDS);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<AdminTechnician | null>(null);

  const showLegacyPhotoWarning =
    isLegacyInvalidPhotoUrl(photoOriginal) && form.photo_url.trim() === photoOriginal.trim();

  useEffect(() => {
    const id = window.setTimeout(() => setAppliedSearch(search), SEARCH_DEBOUNCE_MS);
    return () => window.clearTimeout(id);
  }, [search]);

  useEffect(() => {
    getServices({ include_inactive: false, limit: 100 })
      .then((res) => setServices(res.data))
      .catch(() => {});
    getDistricts({ include_inactive: false, limit: 100 })
      .then((res) => setDistricts(res.data))
      .catch(() => {});
  }, []);

  const fetchTechnicians = useCallback(
    (options: { silent?: boolean } = {}) => {
      if (!options.silent) setLoading(true);
      return getTechnicians({
        search: appliedSearch || undefined,
        service: serviceFilter || undefined,
        limit: LIMIT,
        offset,
      })
        .then((res) => {
          setTechnicians(res.data);
          setTotal(res.meta.total);
          setError(false);
        })
        .catch(() => {
          if (!options.silent) setError(true);
        })
        .finally(() => {
          if (!options.silent) setLoading(false);
        });
    },
    [appliedSearch, serviceFilter, offset],
  );

  useEffect(() => {
    void fetchTechnicians();
  }, [fetchTechnicians]);

  function openCreate() {
    setForm(emptyForm());
    setPhotoOriginal('');
    setOriginalFields(EMPTY_ORIGINAL_FIELDS);
    setDrawerOpen(true);
  }

  function openEdit(technician: AdminTechnician) {
    const translations = Object.fromEntries(
      LOCALES.map((l) => {
        const existing = technician.translations.find((tr) => tr.locale === l);
        return [l, { bio: existing?.bio ?? '' }];
      }),
    ) as TechnicianForm['translations'];

    setPhotoOriginal(technician.photo_url ?? '');
    setOriginalFields({
      email: technician.email ?? '',
      years_exp: technician.years_exp ?? null,
    });
    setForm({
      id: technician.id,
      name: technician.name,
      slug: technician.slug,
      phone: technician.phone,
      whatsapp: technician.whatsapp ?? '',
      email: technician.email ?? '',
      photo_url: technician.photo_url ?? '',
      service_area: technician.service_area ?? '',
      years_exp: technician.years_exp ?? '',
      sort_order: technician.sort_order,
      is_featured: technician.is_featured,
      is_available: technician.is_available,
      is_active: technician.is_active,
      languages: technician.languages?.join(', ') ?? '',
      working_hours: technician.working_hours ? JSON.stringify(technician.working_hours, null, 2) : '',
      translations,
      services: technician.services.map((s) => ({
        service_id: s.service_id,
        estimated_price_min: s.estimated_price_min != null ? String(s.estimated_price_min) : '',
        estimated_price_max: s.estimated_price_max != null ? String(s.estimated_price_max) : '',
      })),
      districts: technician.districts.map((d) => d.id),
      media: filterAllowedImageUrls(technician.media.map((m) => m.url)),
    });
    setDrawerOpen(true);
  }

  async function handleSubmit() {
    if (!form.name.trim() || !form.slug.trim() || !form.phone.trim()) {
      showToast(t('technicians_required'), 'error');
      return;
    }
    const photoUrl = resolvePhotoUrlPayload(form.photo_url, photoOriginal);
    if (photoUrl !== undefined && photoUrl !== null && !isAllowedImageUrl(photoUrl)) {
      showToast(t('technicians_image_url_invalid'), 'error');
      return;
    }
    if (findInvalidImageUrl(form.media)) {
      showToast(t('technicians_image_url_invalid'), 'error');
      return;
    }
    const email = resolveOptionalString(form.email, originalFields.email, isValidEmail);
    const yearsExp = resolveYearsExp(form.years_exp, originalFields.years_exp);
    setSaving(true);
    let workingHours: Record<string, string> | undefined;
    if (form.working_hours.trim()) {
      try {
        workingHours = JSON.parse(form.working_hours);
      } catch {
        showToast(t('technicians_working_hours_invalid'), 'error');
        setSaving(false);
        return;
      }
    }
    try {
      const payload = {
        name: form.name.trim(),
        slug: form.slug.trim(),
        phone: form.phone.trim(),
        whatsapp: form.whatsapp.trim() || null,
        ...(email !== undefined ? { email } : {}),
        ...(photoUrl !== undefined ? { photo_url: photoUrl } : {}),
        service_area: form.service_area.trim() || null,
        ...(yearsExp !== undefined ? { years_exp: yearsExp } : {}),
        sort_order: Number(form.sort_order) || 0,
        is_featured: form.is_featured,
        is_available: form.is_available,
        is_active: form.is_active,
        languages: form.languages.split(',').map((l) => l.trim()).filter(Boolean),
        working_hours: workingHours,
        translations: LOCALES.filter((l) => form.translations[l].bio.trim()).map((l) => ({
          locale: l,
          bio: form.translations[l].bio.trim(),
        })),
        services: form.services
          .filter((s) => s.service_id)
          .map((s) => ({
            service_id: s.service_id,
            estimated_price_min: s.estimated_price_min === '' ? null : Number(s.estimated_price_min),
            estimated_price_max: s.estimated_price_max === '' ? null : Number(s.estimated_price_max),
          })),
        districts: form.districts,
        media: buildMediaPayload(form.media),
      };

      if (form.id) {
        await updateTechnician(form.id, payload);
        showToast(t('technicians_updated'), 'success');
      } else {
        await createTechnician(payload);
        showToast(t('technicians_created'), 'success');
      }
      setDrawerOpen(false);
      setSearch('');
      setAppliedSearch('');
      setServiceFilter('');
      setOffset(0);
    } catch (error) {
      const message =
        error instanceof AdminClientError && error.status >= 400 && error.status < 500 ? error.message : '';
      showToast(message || t('action_failed'), 'error');
    } finally {
      setSaving(false);
    }
  }

  async function handleToggleActive(technician: AdminTechnician) {
    const original = technician;
    setTechnicians((prev) =>
      prev.map((tech) => (tech.id === technician.id ? { ...tech, is_active: !tech.is_active } : tech)),
    );
    try {
      const updated = await updateTechnician(technician.id, { is_active: !technician.is_active });
      setTechnicians((prev) => prev.map((tech) => (tech.id === updated.data.id ? updated.data : tech)));
    } catch {
      setTechnicians((prev) => prev.map((tech) => (tech.id === original.id ? original : tech)));
      showToast(t('action_failed'), 'error');
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setSaving(true);
    try {
      await deleteTechnician(deleteTarget.id);
      setTechnicians((prev) => prev.filter((tech) => tech.id !== deleteTarget.id));
      setTotal((prev) => Math.max(0, prev - 1));
      showToast(t('technicians_deleted'), 'success');
      setDeleteTarget(null);
    } catch {
      showToast(t('action_failed'), 'error');
    } finally {
      setSaving(false);
    }
  }

  function setServiceRow(index: number, patch: Partial<TechnicianForm['services'][number]>) {
    setForm((prev) => ({
      ...prev,
      services: prev.services.map((s, i) => (i === index ? { ...s, ...patch } : s)),
    }));
  }

  return (
    <AdminSection>
      <AdminPageHeader
        eyebrow={t('technicians')}
        title={t('technicians_title')}
        description={t('technicians_description')}
        actions={
          <AdminButton onClick={openCreate}>
            <Plus size={16} />
            {t('technicians_add')}
          </AdminButton>
        }
      />

      <AdminFilterBar>
        <div className="relative w-full md:max-w-xs">
          <Search size={16} className="pointer-events-none absolute start-3 top-1/2 -translate-y-1/2 text-neutral-400" />
          <AdminInput
            type="search"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setOffset(0);
            }}
            placeholder={t('search_placeholder')}
            aria-label={t('search_placeholder')}
            className="ps-9"
          />
        </div>
        <AdminSelect
          value={serviceFilter}
          onChange={(e) => {
            setServiceFilter(e.target.value);
            setOffset(0);
          }}
          aria-label={t('technicians_filter_service')}
          className="w-full md:w-auto"
        >
          <option value="">{t('technicians_all_services')}</option>
          {services.map((service) => (
            <option key={service.id} value={service.slug}>
              {service.translations.find((tr) => tr.locale === 'fr')?.name || service.slug}
            </option>
          ))}
        </AdminSelect>
      </AdminFilterBar>

      {loading ? (
        <div className="grid gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <AdminSkeleton key={i} className="h-20 rounded-2xl" />
          ))}
        </div>
      ) : error ? (
        <AdminEmptyState
          title={t('error_loading')}
          description={t('error_loading_description')}
          action={
            <AdminButton variant="secondary" onClick={() => void fetchTechnicians()}>
              <RefreshCw size={16} />
              {t('retry')}
            </AdminButton>
          }
        />
      ) : technicians.length === 0 ? (
        appliedSearch !== '' || serviceFilter !== '' ? (
          <AdminEmptyState
            title={t('no_results')}
            description={t('no_results_description')}
            action={
              <AdminButton variant="secondary" onClick={() => { setSearch(''); setAppliedSearch(''); setServiceFilter(''); setOffset(0); }}>
                <Search size={16} />
                {t('clear_filters')}
              </AdminButton>
            }
          />
        ) : (
          <AdminEmptyState title={t('technicians_no_technicians')} />
        )
      ) : (
        <AdminTable>
          <AdminTableHeader className="hidden md:block">
            <div className="grid grid-cols-12 gap-3">
              <div className="col-span-4">{t('technicians_name')}</div>
              <div className="col-span-3">{t('technicians_phone')}</div>
              <div className="col-span-3">{t('technicians_services')}</div>
              <div className="col-span-2" />
            </div>
          </AdminTableHeader>
          {technicians.map((technician) => (
            <AdminTableRow key={technician.id}>
              <div className="grid grid-cols-1 gap-2 md:grid-cols-12 md:items-center md:gap-3">
                <AdminTableCell className="md:col-span-4">
                  <span className="font-semibold text-neutral-950 dark:text-neutral-50">{technician.name}</span>
                  <span className="block text-xs text-neutral-500">{technician.slug}</span>
                </AdminTableCell>
                <AdminTableCell className="md:col-span-3 text-neutral-500">{technician.phone}</AdminTableCell>
                <AdminTableCell className="md:col-span-3">
                  <AdminToolbar className="flex-wrap">
                    {technician.services.length > 0 && (
                      <AdminBadge tone="brand">{technician.services.length}</AdminBadge>
                    )}
                    <AdminBadge tone={technician.is_featured ? 'warning' : 'neutral'}>
                      {technician.is_featured ? t('technicians_featured') : '—'}
                    </AdminBadge>
                    <AdminBadge tone={technician.is_active ? 'success' : 'neutral'}>
                      {technician.is_active ? t('technicians_active') : t('technicians_inactive')}
                    </AdminBadge>
                  </AdminToolbar>
                </AdminTableCell>
                <AdminTableCell className="md:col-span-2">
                  <AdminToolbar className="justify-end">
                    <AdminIconButton onClick={() => openEdit(technician)} aria-label={t('edit')}>
                      <Pencil size={16} />
                    </AdminIconButton>
                    <AdminIconButton onClick={() => handleToggleActive(technician)} aria-label={t('technicians_toggle_active')}>
                      <Power size={16} />
                    </AdminIconButton>
                    <AdminIconButton onClick={() => setDeleteTarget(technician)} aria-label={t('delete')}>
                      <Trash2 size={16} />
                    </AdminIconButton>
                  </AdminToolbar>
                </AdminTableCell>
              </div>
            </AdminTableRow>
          ))}
          <AdminPaginationControls
            total={total}
            limit={LIMIT}
            offset={offset}
            prevLabel={t('previous')}
            nextLabel={t('next')}
            onPage={setOffset}
          />
        </AdminTable>
      )}

      <AdminDrawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        title={form.id ? t('technicians_edit') : t('technicians_new')}
        description={form.id ? form.name : undefined}
        footer={
          <>
            <AdminButton variant="secondary" onClick={() => setDrawerOpen(false)}>
              {t('cancel')}
            </AdminButton>
            <AdminButton onClick={handleSubmit} disabled={saving}>
              {saving ? t('loading') : t('save')}
            </AdminButton>
          </>
        }
      >
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <AdminLabel htmlFor="tc-name">{t('technicians_name')}</AdminLabel>
              <AdminInput
                id="tc-name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <AdminLabel htmlFor="tc-slug">{t('technicians_slug')}</AdminLabel>
              <AdminInput
                id="tc-slug"
                value={form.slug}
                onChange={(e) => setForm({ ...form, slug: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <AdminLabel htmlFor="tc-phone">{t('technicians_phone')}</AdminLabel>
              <AdminInput
                id="tc-phone"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                placeholder="0612345678"
              />
            </div>
            <div className="space-y-1.5">
              <AdminLabel htmlFor="tc-whatsapp">{t('technicians_whatsapp')}</AdminLabel>
              <AdminInput
                id="tc-whatsapp"
                value={form.whatsapp}
                onChange={(e) => setForm({ ...form, whatsapp: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <AdminLabel htmlFor="tc-email">{t('technicians_email')}</AdminLabel>
              <AdminInput
                id="tc-email"
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <AdminLabel htmlFor="tc-photo">{t('technicians_photo_url')}</AdminLabel>
              <AdminInput
                id="tc-photo"
                value={form.photo_url}
                onChange={(e) => setForm({ ...form, photo_url: e.target.value })}
                placeholder="https://..."
              />
              {showLegacyPhotoWarning && (
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <p className="text-xs font-medium text-amber-600 dark:text-amber-400">
                    {t('technicians_photo_invalid')}
                  </p>
                  <AdminButton
                    variant="ghost"
                    className="h-auto px-2 py-1 text-xs"
                    onClick={() => setForm({ ...form, photo_url: '' })}
                  >
                    <Trash2 size={12} />
                    {t('technicians_remove_photo')}
                  </AdminButton>
                </div>
              )}
            </div>
            <div className="space-y-1.5">
              <AdminLabel htmlFor="tc-area">{t('technicians_service_area')}</AdminLabel>
              <AdminInput
                id="tc-area"
                value={form.service_area}
                onChange={(e) => setForm({ ...form, service_area: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <AdminLabel htmlFor="tc-lang">{t('technicians_languages')}</AdminLabel>
              <AdminInput
                id="tc-lang"
                value={form.languages}
                onChange={(e) => setForm({ ...form, languages: e.target.value })}
                placeholder="Français, Arabe, Anglais"
              />
            </div>
            <div className="space-y-1.5">
              <AdminLabel htmlFor="tc-hours">{t('technicians_working_hours')}</AdminLabel>
              <AdminInput
                id="tc-hours"
                value={form.working_hours}
                onChange={(e) => setForm({ ...form, working_hours: e.target.value })}
                placeholder='{"lundi":"9:00 - 18:00"}'
              />
            </div>
            <div className="space-y-1.5">
              <AdminLabel htmlFor="tc-exp">{t('technicians_years_exp')}</AdminLabel>
              <AdminInput
                id="tc-exp"
                type="number"
                min={0}
                value={form.years_exp}
                onChange={(e) =>
                  setForm({ ...form, years_exp: e.target.value === '' ? '' : Number(e.target.value) })
                }
              />
            </div>
            <div className="space-y-1.5">
              <AdminLabel htmlFor="tc-order">{t('technicians_sort_order')}</AdminLabel>
              <AdminInput
                id="tc-order"
                type="number"
                value={form.sort_order}
                onChange={(e) => setForm({ ...form, sort_order: Number(e.target.value) })}
              />
            </div>
          </div>

          <div className="space-y-2">
            {([
              ['is_featured', 'technicians_featured'],
              ['is_available', 'technicians_available'],
              ['is_active', 'technicians_active'],
            ] as const).map(([key, labelKey]) => (
              <label key={key} className="flex items-center gap-2 text-sm font-medium text-neutral-700 dark:text-neutral-300">
                <input
                  type="checkbox"
                  checked={form[key]}
                  onChange={(e) => setForm({ ...form, [key]: e.target.checked })}
                  className="h-4 w-4 rounded border-neutral-300 text-brand-500 focus:ring-brand-500/30"
                />
                {t(labelKey)}
              </label>
            ))}
          </div>

          <div>
            <p className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">{t('technicians_services')}</p>
            <div className="mt-3 space-y-3">
              {form.services.map((row, index) => (
                <div key={index} className="rounded-2xl border border-neutral-200/80 p-4 dark:border-neutral-800/80">
                  <AdminSelect
                    value={row.service_id}
                    onChange={(e) => setServiceRow(index, { service_id: e.target.value })}
                    className="mb-3"
                  >
                    <option value="">{t('technicians_select_service')}</option>
                    {services.map((service) => (
                      <option key={service.id} value={service.id}>
                        {service.translations.find((tr) => tr.locale === 'fr')?.name || service.slug}
                      </option>
                    ))}
                  </AdminSelect>
                  <div className="grid grid-cols-2 gap-3">
                    <AdminInput
                      type="number"
                      value={row.estimated_price_min}
                      onChange={(e) => setServiceRow(index, { estimated_price_min: e.target.value })}
                      placeholder={t('technicians_price_min')}
                    />
                    <AdminInput
                      type="number"
                      value={row.estimated_price_max}
                      onChange={(e) => setServiceRow(index, { estimated_price_max: e.target.value })}
                      placeholder={t('technicians_price_max')}
                    />
                  </div>
                  <AdminButton
                    variant="ghost"
                    className="mt-2"
                    onClick={() => setForm({ ...form, services: form.services.filter((_, i) => i !== index) })}
                  >
                    <Trash2 size={14} />
                    {t('remove')}
                  </AdminButton>
                </div>
              ))}
              <AdminButton variant="secondary" onClick={() => setForm({ ...form, services: [...form.services, { service_id: '', estimated_price_min: '', estimated_price_max: '' }] })}>
                <Plus size={16} />
                {t('technicians_add_service')}
              </AdminButton>
            </div>
          </div>

          <div>
            <p className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">{t('technicians_districts')}</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {districts.map((district) => {
                const checked = form.districts.includes(district.id);
                return (
                  <button
                    key={district.id}
                    type="button"
                    onClick={() =>
                      setForm({
                        ...form,
                        districts: checked
                          ? form.districts.filter((id) => id !== district.id)
                          : [...form.districts, district.id],
                      })
                    }
                    className={
                      checked
                        ? 'rounded-full bg-brand-500 px-3 py-1.5 text-xs font-semibold text-white'
                        : 'rounded-full border border-neutral-200/80 bg-white px-3 py-1.5 text-xs font-semibold text-neutral-600 hover:bg-neutral-50 dark:border-neutral-800/80 dark:bg-neutral-900 dark:text-neutral-300'
                    }
                  >
                    {district.translations.find((tr) => tr.locale === 'fr')?.name || district.slug}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <p className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">{t('technicians_media')}</p>
            <div className="mt-3 space-y-2">
              {form.media.map((url, index) => (
                <div key={index} className="flex gap-2">
                  <AdminInput
                    value={url}
                    onChange={(e) =>
                      setForm({ ...form, media: form.media.map((u, i) => (i === index ? e.target.value : u)) })
                    }
                    placeholder="https://..."
                  />
                  <AdminIconButton
                    onClick={() => setForm({ ...form, media: form.media.filter((_, i) => i !== index) })}
                    aria-label={t('remove')}
                  >
                    <Trash2 size={16} />
                  </AdminIconButton>
                </div>
              ))}
              <AdminButton
                variant="secondary"
                onClick={() => setForm({ ...form, media: [...form.media, ''] })}
              >
                <Plus size={16} />
                {t('technicians_add_media')}
              </AdminButton>
            </div>
          </div>

          <div>
            <p className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">{t('technicians_translations')}</p>
            <div className="mt-3 space-y-4">
              {LOCALES.map((locale) => (
                <div key={locale} className="rounded-2xl border border-neutral-200/80 p-4 dark:border-neutral-800/80">
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-neutral-500">{t(`locale_${locale}`)}</p>
                  <div className="space-y-1.5">
                    <AdminLabel>{t('technicians_bio')}</AdminLabel>
                    <textarea
                      value={form.translations[locale].bio}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          translations: {
                            ...form.translations,
                            [locale]: { bio: e.target.value },
                          },
                        })
                      }
                      rows={3}
                      className="w-full rounded-xl border border-neutral-200/80 bg-white px-3 py-2.5 text-sm text-neutral-950 outline-none transition-colors placeholder:text-neutral-400 focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 dark:border-neutral-800/80 dark:bg-neutral-900 dark:text-neutral-50"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </AdminDrawer>

      <AdminConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title={t('confirm_delete_title')}
        description={t('confirm_delete_description')}
        confirmLabel={t('delete')}
        cancelLabel={t('cancel')}
        loading={saving}
        onConfirm={handleDelete}
      />
    </AdminSection>
  );
}
