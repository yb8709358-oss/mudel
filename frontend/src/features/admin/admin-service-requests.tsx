'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Check, MessageSquare, Phone, RefreshCw, Search, Trash2 } from 'lucide-react';
import {
  AdminBadge,
  AdminButton,
  AdminConfirmDialog,
  AdminDrawer,
  AdminEmptyState,
  AdminFilterBar,
  AdminIconButton,
  AdminInput,
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
import { AdminAttachmentGallery } from '@/features/admin/components/admin-attachment-gallery';
import {
  bulkServiceRequestAction,
  deleteServiceRequest,
  getServiceRequests,
  updateServiceRequestStatus,
} from '@/lib/admin-api';
import { normalizePhone } from '@/lib/phone';
import { AdminServiceRequest, ServiceRequestStatus } from '@/types/admin';

const LIMIT = 20;
const SEARCH_DEBOUNCE_MS = 300;

const statusTone: Record<string, 'neutral' | 'brand' | 'success' | 'warning' | 'danger'> = {
  pending: 'warning',
  contacted: 'brand',
  confirmed: 'success',
  completed: 'success',
  cancelled: 'danger',
};

const allStatuses: ServiceRequestStatus[] = ['pending', 'contacted', 'confirmed', 'completed', 'cancelled'];
type SortOrder = 'newest' | 'oldest';

export function AdminServiceRequests() {
  const t = useTranslations('admin');
  const { showToast } = useToast();

  const [requests, setRequests] = useState<AdminServiceRequest[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const [search, setSearch] = useState('');
  const [appliedSearch, setAppliedSearch] = useState('');
  const [status, setStatus] = useState('');
  const [sort, setSort] = useState<SortOrder>('newest');
  const [offset, setOffset] = useState(0);

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkStatus, setBulkStatus] = useState('');
  const [selected, setSelected] = useState<AdminServiceRequest | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AdminServiceRequest | null>(null);
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const id = window.setTimeout(() => setAppliedSearch(search), SEARCH_DEBOUNCE_MS);
    return () => window.clearTimeout(id);
  }, [search]);

  const fetchPage = useCallback(
    async (options: { silent?: boolean } = {}) => {
      if (!options.silent) setLoading(true);
      setError(false);
      try {
        const res = await getServiceRequests({
          status: status || undefined,
          search: appliedSearch || undefined,
          sort,
          limit: LIMIT,
          offset,
        });
        if (res.meta.offset > 0 && res.meta.total > 0 && res.meta.offset >= res.meta.total) {
          setOffset(Math.max(0, Math.floor((res.meta.total - 1) / LIMIT) * LIMIT));
        }
        setRequests(res.data);
        setTotal(res.meta.total);
      } catch {
        setError(true);
      } finally {
        if (!options.silent) setLoading(false);
      }
    },
    [status, appliedSearch, sort, offset],
  );

  useEffect(() => {
    setSelectedIds(new Set());
    void fetchPage();
  }, [fetchPage]);

  function clearFilters() {
    setSearch('');
    setAppliedSearch('');
    setStatus('');
    setSort('newest');
    setOffset(0);
  }

  function toggleSelected(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  function toggleAllPage() {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      const allSelected = requests.length > 0 && requests.every((r) => next.has(r.id));
      requests.forEach((r) => {
        if (allSelected) {
          next.delete(r.id);
        } else {
          next.add(r.id);
        }
      });
      return next;
    });
  }

  async function handleUpdateStatus(request: AdminServiceRequest, nextStatus: ServiceRequestStatus, notes?: string) {
    const original = request;
    setRequests((prev) => prev.map((r) => (r.id === request.id ? { ...r, status: nextStatus, admin_notes: notes } : r)));
    if (selected?.id === request.id) setSelected({ ...selected, status: nextStatus, admin_notes: notes });
    try {
      const updated = await updateServiceRequestStatus(request.id, nextStatus, notes);
      setRequests((prev) => prev.map((r) => (r.id === updated.data.id ? updated.data : r)));
      if (selected?.id === request.id) setSelected(updated.data);
      showToast(t('sr_status_updated'), 'success');
    } catch {
      setRequests((prev) => prev.map((r) => (r.id === original.id ? original : r)));
      if (selected?.id === original.id) setSelected(original);
      showToast(t('action_failed'), 'error');
    }
  }

  async function handleDelete(target: AdminServiceRequest) {
    setBusy(true);
    setDeleteTarget(null);
    setRequests((prev) => prev.filter((r) => r.id !== target.id));
    setTotal((prev) => Math.max(0, prev - 1));
    if (selected?.id === target.id) setSelected(null);
    try {
      await deleteServiceRequest(target.id);
      showToast(t('sr_deleted'), 'success');
    } catch {
      void fetchPage({ silent: true });
      showToast(t('action_failed'), 'error');
    } finally {
      setBusy(false);
    }
  }

  async function handleBulkDelete() {
    const ids = [...selectedIds];
    if (!ids.length) return;
    setBusy(true);
    setBulkDeleteOpen(false);
    const removed = requests.filter((r) => selectedIds.has(r.id)).length;
    setRequests((prev) => prev.filter((r) => !selectedIds.has(r.id)));
    setTotal((prev) => Math.max(0, prev - removed));
    setSelectedIds(new Set());
    try {
      const res = await bulkServiceRequestAction(ids, 'delete');
      showToast(t('sr_bulk_delete_done', { count: res.data.processed }), 'success');
    } catch {
      void fetchPage({ silent: true });
      showToast(t('action_failed'), 'error');
    } finally {
      setBusy(false);
    }
  }

  async function handleBulkStatus(nextStatus: ServiceRequestStatus) {
    const ids = [...selectedIds];
    if (!ids.length) return;
    setRequests((prev) => prev.map((r) => (selectedIds.has(r.id) ? { ...r, status: nextStatus } : r)));
    setSelectedIds(new Set());
    setBulkStatus('');
    try {
      const res = await bulkServiceRequestAction(ids, 'update_status', nextStatus);
      showToast(t('sr_bulk_status_done', { count: res.data.processed }), 'success');
    } catch {
      void fetchPage({ silent: true });
      showToast(t('action_failed'), 'error');
    }
  }

  const serviceName = useCallback(
    (request: AdminServiceRequest) => request.service?.translations?.find((tr) => tr.locale === 'fr')?.name || request.service?.slug || '—',
    [],
  );
  const districtName = useCallback(
    (request: AdminServiceRequest) => request.district?.translations?.find((tr) => tr.locale === 'fr')?.name || request.district?.slug || '—',
    [],
  );

  function formatDate(value: string) {
    return new Date(value).toLocaleString();
  }

  const allPageSelected = requests.length > 0 && requests.every((r) => selectedIds.has(r.id));
  const hasActiveFilters = appliedSearch !== '' || status !== '';

  return (
    <AdminSection>
      <AdminPageHeader eyebrow={t('service_requests')} title={t('sr_title')} description={t('sr_description')} />

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
        <AdminToolbar className="w-full md:w-auto">
          <AdminSelect
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setOffset(0);
            }}
            aria-label={t('filter_status')}
            className="md:w-auto"
          >
            <option value="">{t('sr_all_statuses')}</option>
            {allStatuses.map((s) => (
              <option key={s} value={s}>
                {t(`sr_status_${s}`)}
              </option>
            ))}
          </AdminSelect>
          <AdminSelect
            value={sort}
            onChange={(e) => {
              setSort(e.target.value as SortOrder);
              setOffset(0);
            }}
            aria-label={t('sort_label')}
            className="md:w-auto"
          >
            <option value="newest">{t('sort_newest')}</option>
            <option value="oldest">{t('sort_oldest')}</option>
          </AdminSelect>
        </AdminToolbar>
      </AdminFilterBar>

      {selectedIds.size > 0 && (
        <AdminFilterBar>
          <div className="flex items-center gap-2 text-sm font-semibold text-neutral-900 dark:text-neutral-100">
            <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-brand-500/15 text-brand-600 dark:text-brand-400">
              <Check size={14} />
            </span>
            {t('selected_count', { count: selectedIds.size })}
          </div>
          <AdminToolbar>
            <AdminSelect
              value={bulkStatus}
              onChange={(e) => setBulkStatus(e.target.value)}
              aria-label={t('sr_bulk_status')}
              className="w-full sm:w-44"
            >
              <option value="">{t('sr_bulk_status_placeholder')}</option>
              {allStatuses.map((s) => (
                <option key={s} value={s}>
                  {t(`sr_status_${s}`)}
                </option>
              ))}
            </AdminSelect>
            <AdminButton
              variant="secondary"
              disabled={!bulkStatus}
              onClick={() => bulkStatus && void handleBulkStatus(bulkStatus as ServiceRequestStatus)}
            >
              {t('sr_bulk_apply_status')}
            </AdminButton>
            <AdminButton variant="danger" onClick={() => setBulkDeleteOpen(true)}>
              <Trash2 size={16} />
              {t('bulk_delete')}
            </AdminButton>
          </AdminToolbar>
        </AdminFilterBar>
      )}

      {loading ? (
        <div className="grid gap-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <AdminSkeleton key={i} className="h-20 rounded-2xl" />
          ))}
        </div>
      ) : error ? (
        <AdminEmptyState
          title={t('error_loading')}
          description={t('error_loading_description')}
          action={
            <AdminButton variant="secondary" onClick={() => void fetchPage()}>
              <RefreshCw size={16} />
              {t('retry')}
            </AdminButton>
          }
        />
      ) : requests.length === 0 ? (
        hasActiveFilters ? (
          <AdminEmptyState
            title={t('no_results')}
            description={t('no_results_description')}
            action={
              <AdminButton variant="secondary" onClick={clearFilters}>
                <Search size={16} />
                {t('clear_filters')}
              </AdminButton>
            }
          />
        ) : (
          <AdminEmptyState title={t('sr_no_requests')} />
        )
      ) : (
        <AdminTable>
          <AdminTableHeader className="hidden md:block">
            <div className="grid grid-cols-12 gap-3">
              <div className="col-span-1">
                <label className="inline-flex cursor-pointer items-center gap-2">
                  <input
                    type="checkbox"
                    checked={allPageSelected}
                    onChange={toggleAllPage}
                    aria-label={t('select_all')}
                    className="h-4 w-4 rounded border-neutral-300 accent-brand-500"
                  />
                </label>
              </div>
              <div className="col-span-3">{t('sr_customer')}</div>
              <div className="col-span-3">{t('sr_service')}</div>
              <div className="col-span-2">{t('sr_district')}</div>
              <div className="col-span-2">{t('sr_status')}</div>
              <div className="col-span-1" />
            </div>
          </AdminTableHeader>
          {requests.map((request) => (
            <AdminTableRow key={request.id}>
              <div className="relative grid grid-cols-[1fr_auto] items-center gap-2 md:grid-cols-12 md:gap-3">
                <div className="absolute start-0 top-1/2 -translate-y-1/2 md:static md:col-span-1 md:translate-y-0">
                  <input
                    type="checkbox"
                    checked={selectedIds.has(request.id)}
                    onChange={() => toggleSelected(request.id)}
                    aria-label={t('select_request', { name: request.customer_name })}
                    className="h-4 w-4 rounded border-neutral-300 accent-brand-500"
                  />
                </div>
                <AdminTableCell className="ps-8 md:col-span-3 md:ps-0">
                  <button
                    type="button"
                    onClick={() => setSelected(request)}
                    aria-label={`${t('view')}: ${request.customer_name}`}
                    className="block w-full min-w-0 text-start"
                  >
                    <span className="block font-semibold text-neutral-950 dark:text-neutral-50">
                      {request.customer_name}
                    </span>
                    <span className="block text-xs text-neutral-500">{request.customer_phone}</span>
                    {request.address && (
                      <span className="block max-w-full truncate text-xs text-neutral-500">
                        {request.address}
                      </span>
                    )}
                  </button>
                </AdminTableCell>
                <AdminTableCell className="hidden md:col-span-3 md:block">{serviceName(request)}</AdminTableCell>
                <AdminTableCell className="hidden md:col-span-2 md:block">{districtName(request)}</AdminTableCell>
                <AdminTableCell className="hidden md:col-span-2 md:block">
                  <AdminBadge tone={statusTone[request.status] ?? 'neutral'}>
                    {t(`sr_status_${request.status}`)}
                  </AdminBadge>
                </AdminTableCell>
                <AdminTableCell className="md:col-span-1">
                  <AdminToolbar className="justify-end">
                    <AdminIconButton onClick={() => setDeleteTarget(request)} aria-label={t('delete')}>
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
        open={!!selected}
        onOpenChange={(open) => !open && setSelected(null)}
        title={selected?.customer_name}
        description={selected ? formatDate(selected.created_at) : undefined}
        footer={
          selected && (
            <>
              <a
                href={`tel:${selected.customer_phone.replace(/\s+/g, '')}`}
                className="inline-flex items-center gap-2 rounded-xl border border-neutral-200/80 bg-white px-4 py-2.5 text-sm font-semibold text-neutral-800 transition-colors hover:bg-neutral-50 dark:border-neutral-800/80 dark:bg-neutral-900 dark:text-neutral-100 dark:hover:bg-neutral-800"
              >
                <Phone size={16} />
                {t('call')}
              </a>
              <a
                href={`https://wa.me/${normalizePhone(selected.customer_phone).replace('+', '')}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 rounded-xl border border-neutral-200/80 bg-white px-4 py-2.5 text-sm font-semibold text-neutral-800 transition-colors hover:bg-neutral-50 dark:border-neutral-800/80 dark:bg-neutral-900 dark:text-neutral-100 dark:hover:bg-neutral-800"
              >
                <MessageSquare size={16} />
                {t('whatsapp')}
              </a>
              <AdminButton variant="danger" onClick={() => setDeleteTarget(selected)}>
                <Trash2 size={16} />
                {t('delete')}
              </AdminButton>
            </>
          )
        }
      >
        {selected && (
          <div className="space-y-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">{t('sr_request_number')}</p>
                <p className="mt-1 text-sm font-medium text-neutral-900 dark:text-neutral-100">{selected.request_number || '—'}</p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">{t('sr_service')}</p>
                <p className="mt-1 text-sm font-medium text-neutral-900 dark:text-neutral-100">{serviceName(selected)}</p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">{t('sr_status')}</p>
                <AdminBadge tone={statusTone[selected.status] ?? 'neutral'} className="mt-1">
                  {t(`sr_status_${selected.status}`)}
                </AdminBadge>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">{t('sr_phone')}</p>
                <p className="mt-1 text-sm font-medium text-neutral-900 dark:text-neutral-100">{selected.customer_phone}</p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">{t('sr_email')}</p>
                <p className="mt-1 text-sm font-medium text-neutral-900 dark:text-neutral-100">{selected.customer_email || '—'}</p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">{t('sr_district')}</p>
                <p className="mt-1 text-sm font-medium text-neutral-900 dark:text-neutral-100">{districtName(selected)}</p>
              </div>
              <div className="sm:col-span-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">{t('sr_address')}</p>
                <p className="mt-1 text-sm font-medium text-neutral-900 dark:text-neutral-100">{selected.address || '—'}</p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">{t('sr_latitude')}</p>
                <p className="mt-1 text-sm font-medium text-neutral-900 dark:text-neutral-100">
                  {selected.latitude != null ? selected.latitude : '—'}
                </p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">{t('sr_longitude')}</p>
                <p className="mt-1 text-sm font-medium text-neutral-900 dark:text-neutral-100">
                  {selected.longitude != null ? selected.longitude : '—'}
                </p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">{t('sr_technician')}</p>
                <p className="mt-1 text-sm font-medium text-neutral-900 dark:text-neutral-100">
                  {selected.technician?.name || '—'}
                </p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">{t('sr_preferred_date')}</p>
                <p className="mt-1 text-sm font-medium text-neutral-900 dark:text-neutral-100">
                  {selected.preferred_date || '—'}
                </p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">{t('sr_preferred_time')}</p>
                <p className="mt-1 text-sm font-medium text-neutral-900 dark:text-neutral-100">
                  {selected.preferred_time || '—'}
                </p>
              </div>
            </div>

            {selected.description && (
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">{t('sr_description_label')}</p>
                <p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-neutral-600 dark:text-neutral-400">
                  {selected.description}
                </p>
              </div>
            )}

            <AdminAttachmentGallery attachments={selected.attachments} label={t('attachments')} />

            <div className="rounded-2xl border border-neutral-200/80 p-4 dark:border-neutral-800/80">
              <p className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">{t('sr_update_status')}</p>
              <div className="mt-3 flex flex-col gap-3 sm:flex-row">
                <AdminSelect
                  value={selected.status}
                  onChange={(e) => setSelected({ ...selected, status: e.target.value as ServiceRequestStatus })}
                  aria-label={t('sr_status')}
                  className="w-full sm:w-48"
                >
                  {allStatuses.map((s) => (
                    <option key={s} value={s}>
                      {t(`sr_status_${s}`)}
                    </option>
                  ))}
                </AdminSelect>
                <AdminButton
                  onClick={() => handleUpdateStatus(selected, selected.status, selected.admin_notes || undefined)}
                  disabled={busy}
                >
                  {t('save')}
                </AdminButton>
              </div>
              <div className="mt-3">
                <AdminInput
                  type="text"
                  value={selected.admin_notes ?? ''}
                  onChange={(e) => setSelected({ ...selected, admin_notes: e.target.value })}
                  placeholder={t('sr_notes_placeholder')}
                  aria-label={t('sr_notes_placeholder')}
                />
              </div>
            </div>
          </div>
        )}
      </AdminDrawer>

      <AdminConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title={t('confirm_delete_title')}
        description={t('confirm_delete_description')}
        confirmLabel={t('delete')}
        cancelLabel={t('cancel')}
        loading={busy}
        onConfirm={() => deleteTarget && void handleDelete(deleteTarget)}
      />

      <AdminConfirmDialog
        open={bulkDeleteOpen}
        onOpenChange={(open) => !open && setBulkDeleteOpen(false)}
        title={t('sr_bulk_delete_title')}
        description={t('sr_bulk_delete_description', { count: selectedIds.size })}
        confirmLabel={t('bulk_delete')}
        cancelLabel={t('cancel')}
        loading={busy}
        onConfirm={() => void handleBulkDelete()}
      />
    </AdminSection>
  );
}
