'use client';

import { useCallback, useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Pencil, Plus, Power, RefreshCw, Search, Trash2 } from 'lucide-react';
import {
  AdminBadge,
  AdminButton,
  AdminConfirmDialog,
  AdminEmptyState,
  AdminFilterBar,
  AdminIconButton,
  AdminInput,
  AdminLabel,
  AdminModal,
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
import { createService, deleteService, getService, getServices, updateService } from '@/lib/admin-api';
import { AdminService } from '@/types/admin';

const LIMIT = 20;
const SEARCH_DEBOUNCE_MS = 300;
const LOCALES = ['fr', 'en', 'ar'] as const;

type ActiveFilter = '' | 'active' | 'inactive';

type TranslationForm = {
  name: string;
  description: string;
  meta_title: string;
  meta_desc: string;
};

type ServiceForm = {
  id?: string;
  slug: string;
  icon: string;
  sort_order: number;
  is_active: boolean;
  translations: Record<string, TranslationForm>;
  media: string[];
};

const emptyForm = (): ServiceForm => ({
  slug: '',
  icon: 'wrench',
  sort_order: 0,
  is_active: true,
  translations: Object.fromEntries(LOCALES.map((l) => [l, { name: '', description: '', meta_title: '', meta_desc: '' }])) as ServiceForm['translations'],
  media: [],
});

export function AdminServices() {
  const t = useTranslations('admin');
  const { showToast } = useToast();

  const [services, setServices] = useState<AdminService[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [search, setSearch] = useState('');
  const [appliedSearch, setAppliedSearch] = useState('');
  const [isActive, setIsActive] = useState<ActiveFilter>('');
  const [offset, setOffset] = useState(0);

  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState<ServiceForm>(emptyForm());
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<AdminService | null>(null);

  useEffect(() => {
    const id = window.setTimeout(() => setAppliedSearch(search), SEARCH_DEBOUNCE_MS);
    return () => window.clearTimeout(id);
  }, [search]);

  const fetchServices = useCallback(
    (options: { silent?: boolean } = {}) => {
      if (!options.silent) setLoading(true);
      return getServices({
        search: appliedSearch || undefined,
        is_active: isActive === 'active' ? true : isActive === 'inactive' ? false : undefined,
        limit: LIMIT,
        offset,
      })
        .then((res) => {
          setServices(res.data);
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
    [appliedSearch, isActive, offset],
  );

  useEffect(() => {
    void fetchServices();
  }, [fetchServices]);

  function serviceName(service: AdminService) {
    return service.translations.find((tr) => tr.locale === 'fr')?.name || service.slug;
  }

  function openCreate() {
    setForm(emptyForm());
    setFormOpen(true);
  }

  function openEdit(service: AdminService) {
    const openWith = (target: AdminService) => {
      const translations = Object.fromEntries(
        LOCALES.map((l) => {
          const existing = target.translations.find((tr) => tr.locale === l);
          return [
            l,
            {
              name: existing?.name ?? '',
              description: existing?.description ?? '',
              meta_title: existing?.meta_title ?? '',
              meta_desc: existing?.meta_desc ?? '',
            },
          ];
        }),
      ) as ServiceForm['translations'];

      setForm({
        id: target.id,
        slug: target.slug,
        icon: target.icon,
        sort_order: target.sort_order,
        is_active: target.is_active,
        translations,
        media: target.media.map((m) => m.url),
      });
      setFormOpen(true);
    };

    openWith(service);
    // The editor must reflect the stored media even if the list snapshot is
    // stale, so refresh from the backend (falling back to the row data).
    getService(service.id)
      .then((res) => {
        if (res?.data) openWith(res.data);
      })
      .catch(() => {
        // keep the row data
      });
  }

  async function handleSubmit() {
    if (!form.slug.trim()) {
      showToast(t('services_slug_required'), 'error');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        slug: form.slug.trim(),
        icon: form.icon.trim() || 'wrench',
        sort_order: Number(form.sort_order) || 0,
        is_active: form.is_active,
        translations: LOCALES.filter((l) => form.translations[l].name.trim())
          .map((l) => ({
            locale: l,
            name: form.translations[l].name.trim(),
            description: form.translations[l].description.trim() || undefined,
            meta_title: form.translations[l].meta_title.trim() || undefined,
            meta_desc: form.translations[l].meta_desc.trim() || undefined,
          })),
        media: form.media
          .map((url, index) => ({
            url: url.trim(),
            media_type: 'image',
            sort_order: index,
          }))
          .filter((m) => m.url),
      };

      if (form.id) {
        await updateService(form.id, payload);
        showToast(t('services_updated'), 'success');
      } else {
        await createService(payload);
        showToast(t('services_created'), 'success');
      }
      setFormOpen(false);
      setSearch('');
      setAppliedSearch('');
      setIsActive('');
      setOffset(0);
    } catch {
      showToast(t('action_failed'), 'error');
    } finally {
      setSaving(false);
    }
  }

  async function handleToggleActive(service: AdminService) {
    const original = service;
    setServices((prev) =>
      prev.map((s) => (s.id === service.id ? { ...s, is_active: !s.is_active } : s)),
    );
    try {
      const updated = await updateService(service.id, { is_active: !service.is_active });
      setServices((prev) => prev.map((s) => (s.id === updated.data.id ? updated.data : s)));
    } catch {
      setServices((prev) => prev.map((s) => (s.id === original.id ? original : s)));
      showToast(t('action_failed'), 'error');
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setSaving(true);
    try {
      await deleteService(deleteTarget.id);
      setServices((prev) => prev.filter((s) => s.id !== deleteTarget.id));
      setTotal((prev) => Math.max(0, prev - 1));
      showToast(t('services_deleted'), 'success');
      setDeleteTarget(null);
    } catch {
      showToast(t('action_failed'), 'error');
    } finally {
      setSaving(false);
    }
  }

  return (
    <AdminSection>
      <AdminPageHeader
        eyebrow={t('services')}
        title={t('services_title')}
        description={t('services_description')}
        actions={
          <AdminButton onClick={openCreate}>
            <Plus size={16} />
            {t('services_add')}
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
          value={isActive}
          onChange={(e) => {
            setIsActive(e.target.value as ActiveFilter);
            setOffset(0);
          }}
          aria-label={t('filter_status')}
          className="w-full md:w-auto"
        >
          <option value="">{t('services_all_statuses')}</option>
          <option value="active">{t('services_active')}</option>
          <option value="inactive">{t('services_inactive')}</option>
        </AdminSelect>
      </AdminFilterBar>

      {loading ? (
        <div className="grid gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <AdminSkeleton key={i} className="h-16 rounded-2xl" />
          ))}
        </div>
      ) : error ? (
        <AdminEmptyState
          title={t('error_loading')}
          description={t('error_loading_description')}
          action={
            <AdminButton variant="secondary" onClick={() => void fetchServices()}>
              <RefreshCw size={16} />
              {t('retry')}
            </AdminButton>
          }
        />
      ) : services.length === 0 ? (
        appliedSearch !== '' || isActive !== '' ? (
          <AdminEmptyState
            title={t('no_results')}
            description={t('no_results_description')}
            action={
              <AdminButton variant="secondary" onClick={() => { setSearch(''); setAppliedSearch(''); setIsActive(''); setOffset(0); }}>
                <Search size={16} />
                {t('clear_filters')}
              </AdminButton>
            }
          />
        ) : (
          <AdminEmptyState title={t('services_no_services')} />
        )
      ) : (
        <AdminTable>
          <AdminTableHeader className="hidden md:block">
            <div className="grid grid-cols-12 gap-3">
              <div className="col-span-4">{t('services_name')}</div>
              <div className="col-span-2">{t('services_slug')}</div>
              <div className="col-span-2">{t('services_icon')}</div>
              <div className="col-span-2">{t('services_status')}</div>
              <div className="col-span-2" />
            </div>
          </AdminTableHeader>
          {services.map((service) => (
            <AdminTableRow key={service.id}>
              <div className="grid grid-cols-1 gap-2 md:grid-cols-12 md:items-center md:gap-3">
                <AdminTableCell className="md:col-span-4">
                  <span className="font-semibold text-neutral-950 dark:text-neutral-50">{serviceName(service)}</span>
                </AdminTableCell>
                <AdminTableCell className="md:col-span-2 text-neutral-500">{service.slug}</AdminTableCell>
                <AdminTableCell className="md:col-span-2 text-neutral-500">{service.icon}</AdminTableCell>
                <AdminTableCell className="md:col-span-2">
                  <AdminBadge tone={service.is_active ? 'success' : 'neutral'}>
                    {service.is_active ? t('services_active') : t('services_inactive')}
                  </AdminBadge>
                </AdminTableCell>
                <AdminTableCell className="md:col-span-2">
                  <AdminToolbar className="justify-end">
                    <AdminIconButton onClick={() => openEdit(service)} aria-label={t('edit')}>
                      <Pencil size={16} />
                    </AdminIconButton>
                    <AdminIconButton onClick={() => handleToggleActive(service)} aria-label={t('services_toggle_active')}>
                      <Power size={16} />
                    </AdminIconButton>
                    <AdminIconButton onClick={() => setDeleteTarget(service)} aria-label={t('delete')}>
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

      <AdminModal
        open={formOpen}
        onOpenChange={setFormOpen}
        title={form.id ? t('services_edit') : t('services_new')}
        size="lg"
        footer={
          <>
            <AdminButton variant="secondary" onClick={() => setFormOpen(false)}>
              {t('cancel')}
            </AdminButton>
            <AdminButton onClick={handleSubmit} disabled={saving}>
              {saving ? t('loading') : t('save')}
            </AdminButton>
          </>
        }
      >
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-1.5">
              <AdminLabel htmlFor="sv-slug">{t('services_slug')}</AdminLabel>
              <AdminInput
                id="sv-slug"
                value={form.slug}
                onChange={(e) => setForm({ ...form, slug: e.target.value })}
                placeholder="plomberie"
              />
            </div>
            <div className="space-y-1.5">
              <AdminLabel htmlFor="sv-icon">{t('services_icon')}</AdminLabel>
              <AdminInput
                id="sv-icon"
                value={form.icon}
                onChange={(e) => setForm({ ...form, icon: e.target.value })}
                placeholder="wrench"
              />
            </div>
            <div className="space-y-1.5">
              <AdminLabel htmlFor="sv-order">{t('services_sort_order')}</AdminLabel>
              <AdminInput
                id="sv-order"
                type="number"
                value={form.sort_order}
                onChange={(e) => setForm({ ...form, sort_order: Number(e.target.value) })}
              />
            </div>
          </div>

          <label className="flex items-center gap-2 text-sm font-medium text-neutral-700 dark:text-neutral-300">
            <input
              type="checkbox"
              checked={form.is_active}
              onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
              className="h-4 w-4 rounded border-neutral-300 text-brand-500 focus:ring-brand-500/30"
            />
            {t('services_active')}
          </label>

          <div>
            <p className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">{t('services_translations')}</p>
            <div className="mt-3 space-y-4">
              {LOCALES.map((locale) => (
                <div key={locale} className="rounded-2xl border border-neutral-200/80 p-4 dark:border-neutral-800/80">
                  <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-neutral-500">{t(`locale_${locale}`)}</p>
                  <div className="space-y-3">
                    <div className="space-y-1.5">
                      <AdminLabel>{t('services_name_translation')}</AdminLabel>
                      <AdminInput
                        value={form.translations[locale].name}
                        onChange={(e) =>
                          setForm({
                            ...form,
                            translations: {
                              ...form.translations,
                              [locale]: { ...form.translations[locale], name: e.target.value },
                            },
                          })
                        }
                      />
                    </div>
                    <div className="space-y-1.5">
                      <AdminLabel>{t('services_description_translation')}</AdminLabel>
                      <AdminInput
                        value={form.translations[locale].description}
                        onChange={(e) =>
                          setForm({
                            ...form,
                            translations: {
                              ...form.translations,
                              [locale]: { ...form.translations[locale], description: e.target.value },
                            },
                          })
                        }
                      />
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="space-y-1.5">
                        <AdminLabel>{t('services_meta_title')}</AdminLabel>
                        <AdminInput
                          value={form.translations[locale].meta_title}
                          onChange={(e) =>
                            setForm({
                              ...form,
                              translations: {
                                ...form.translations,
                                [locale]: { ...form.translations[locale], meta_title: e.target.value },
                              },
                            })
                          }
                        />
                      </div>
                      <div className="space-y-1.5">
                        <AdminLabel>{t('services_meta_desc')}</AdminLabel>
                        <AdminInput
                          value={form.translations[locale].meta_desc}
                          onChange={(e) =>
                            setForm({
                              ...form,
                              translations: {
                                ...form.translations,
                                [locale]: { ...form.translations[locale], meta_desc: e.target.value },
                              },
                            })
                          }
                        />
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <p className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">{t('services_media')}</p>
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
                {t('services_add_media')}
              </AdminButton>
            </div>
          </div>
        </div>
      </AdminModal>

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
