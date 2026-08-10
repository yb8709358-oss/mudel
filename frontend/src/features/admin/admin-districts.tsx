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
import { createDistrict, deleteDistrict, getDistricts, updateDistrict } from '@/lib/admin-api';
import { AdminDistrict } from '@/types/admin';

const LIMIT = 20;
const SEARCH_DEBOUNCE_MS = 300;
const LOCALES = ['fr', 'en', 'ar'] as const;

type ActiveFilter = '' | 'active' | 'inactive';

type DistrictForm = {
  id?: string;
  slug: string;
  sort_order: number;
  is_active: boolean;
  translations: Record<string, { name: string; description: string }>;
};

const emptyForm = (): DistrictForm => ({
  slug: '',
  sort_order: 0,
  is_active: true,
  translations: Object.fromEntries(LOCALES.map((l) => [l, { name: '', description: '' }])) as DistrictForm['translations'],
});

export function AdminDistricts() {
  const t = useTranslations('admin');
  const { showToast } = useToast();

  const [districts, setDistricts] = useState<AdminDistrict[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [search, setSearch] = useState('');
  const [appliedSearch, setAppliedSearch] = useState('');
  const [isActive, setIsActive] = useState<ActiveFilter>('');
  const [offset, setOffset] = useState(0);

  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState<DistrictForm>(emptyForm());
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<AdminDistrict | null>(null);

  useEffect(() => {
    const id = window.setTimeout(() => setAppliedSearch(search), SEARCH_DEBOUNCE_MS);
    return () => window.clearTimeout(id);
  }, [search]);

  const fetchDistricts = useCallback(
    (options: { silent?: boolean } = {}) => {
      if (!options.silent) setLoading(true);
      return getDistricts({
        search: appliedSearch || undefined,
        is_active: isActive === 'active' ? true : isActive === 'inactive' ? false : undefined,
        limit: LIMIT,
        offset,
      })
        .then((res) => {
          setDistricts(res.data);
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
    void fetchDistricts();
  }, [fetchDistricts]);

  function districtName(district: AdminDistrict) {
    return district.translations.find((tr) => tr.locale === 'fr')?.name || district.slug;
  }

  function openCreate() {
    setForm(emptyForm());
    setFormOpen(true);
  }

  function openEdit(district: AdminDistrict) {
    const translations = Object.fromEntries(
      LOCALES.map((l) => {
        const existing = district.translations.find((tr) => tr.locale === l);
        return [l, { name: existing?.name ?? '', description: existing?.description ?? '' }];
      }),
    ) as DistrictForm['translations'];

    setForm({
      id: district.id,
      slug: district.slug,
      sort_order: district.sort_order,
      is_active: district.is_active,
      translations,
    });
    setFormOpen(true);
  }

  async function handleSubmit() {
    if (!form.slug.trim()) {
      showToast(t('districts_slug_required'), 'error');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        slug: form.slug.trim(),
        sort_order: Number(form.sort_order) || 0,
        is_active: form.is_active,
        translations: LOCALES.filter((l) => form.translations[l].name.trim()).map((l) => ({
          locale: l,
          name: form.translations[l].name.trim(),
          description: form.translations[l].description.trim() || undefined,
        })),
      };

      if (form.id) {
        await updateDistrict(form.id, payload);
        showToast(t('districts_updated'), 'success');
      } else {
        await createDistrict(payload);
        showToast(t('districts_created'), 'success');
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

  async function handleToggleActive(district: AdminDistrict) {
    const original = district;
    setDistricts((prev) =>
      prev.map((d) => (d.id === district.id ? { ...d, is_active: !d.is_active } : d)),
    );
    try {
      const updated = await updateDistrict(district.id, { is_active: !district.is_active });
      setDistricts((prev) => prev.map((d) => (d.id === updated.data.id ? updated.data : d)));
    } catch {
      setDistricts((prev) => prev.map((d) => (d.id === original.id ? original : d)));
      showToast(t('action_failed'), 'error');
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setSaving(true);
    try {
      await deleteDistrict(deleteTarget.id);
      setDistricts((prev) => prev.filter((d) => d.id !== deleteTarget.id));
      setTotal((prev) => Math.max(0, prev - 1));
      showToast(t('districts_deleted'), 'success');
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
        eyebrow={t('districts')}
        title={t('districts_title')}
        description={t('districts_description')}
        actions={
          <AdminButton onClick={openCreate}>
            <Plus size={16} />
            {t('districts_add')}
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
          <option value="">{t('districts_all_statuses')}</option>
          <option value="active">{t('districts_active')}</option>
          <option value="inactive">{t('districts_inactive')}</option>
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
            <AdminButton variant="secondary" onClick={() => void fetchDistricts()}>
              <RefreshCw size={16} />
              {t('retry')}
            </AdminButton>
          }
        />
      ) : districts.length === 0 ? (
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
          <AdminEmptyState title={t('districts_no_districts')} />
        )
      ) : (
        <AdminTable>
          <AdminTableHeader className="hidden md:block">
            <div className="grid grid-cols-12 gap-3">
              <div className="col-span-4">{t('districts_name')}</div>
              <div className="col-span-3">{t('districts_slug')}</div>
              <div className="col-span-2">{t('districts_sort_order')}</div>
              <div className="col-span-2">{t('districts_status')}</div>
              <div className="col-span-1" />
            </div>
          </AdminTableHeader>
          {districts.map((district) => (
            <AdminTableRow key={district.id}>
              <div className="grid grid-cols-1 gap-2 md:grid-cols-12 md:items-center md:gap-3">
                <AdminTableCell className="md:col-span-4">
                  <span className="font-semibold text-neutral-950 dark:text-neutral-50">{districtName(district)}</span>
                </AdminTableCell>
                <AdminTableCell className="md:col-span-3 text-neutral-500">{district.slug}</AdminTableCell>
                <AdminTableCell className="md:col-span-2 text-neutral-500">{district.sort_order}</AdminTableCell>
                <AdminTableCell className="md:col-span-2">
                  <AdminBadge tone={district.is_active ? 'success' : 'neutral'}>
                    {district.is_active ? t('districts_active') : t('districts_inactive')}
                  </AdminBadge>
                </AdminTableCell>
                <AdminTableCell className="md:col-span-1">
                  <AdminToolbar className="justify-end">
                    <AdminIconButton onClick={() => openEdit(district)} aria-label={t('edit')}>
                      <Pencil size={16} />
                    </AdminIconButton>
                    <AdminIconButton onClick={() => handleToggleActive(district)} aria-label={t('districts_toggle_active')}>
                      <Power size={16} />
                    </AdminIconButton>
                    <AdminIconButton onClick={() => setDeleteTarget(district)} aria-label={t('delete')}>
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
        title={form.id ? t('districts_edit') : t('districts_new')}
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
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <AdminLabel htmlFor="dt-slug">{t('districts_slug')}</AdminLabel>
              <AdminInput
                id="dt-slug"
                value={form.slug}
                onChange={(e) => setForm({ ...form, slug: e.target.value })}
                placeholder="gueliz"
              />
            </div>
            <div className="space-y-1.5">
              <AdminLabel htmlFor="dt-order">{t('districts_sort_order')}</AdminLabel>
              <AdminInput
                id="dt-order"
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
            {t('districts_active')}
          </label>

          <div>
            <p className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">{t('districts_translations')}</p>
            <div className="mt-3 space-y-4">
              {LOCALES.map((locale) => (
                <div key={locale} className="rounded-2xl border border-neutral-200/80 p-4 dark:border-neutral-800/80">
                  <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-neutral-500">{t(`locale_${locale}`)}</p>
                  <div className="space-y-3">
                    <div className="space-y-1.5">
                      <AdminLabel>{t('districts_name_translation')}</AdminLabel>
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
                      <AdminLabel>{t('districts_description_translation')}</AdminLabel>
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
                  </div>
                </div>
              ))}
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
