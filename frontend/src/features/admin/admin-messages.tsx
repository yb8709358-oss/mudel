'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Check, ClipboardList, Mail, MailOpen, MessageSquare, Phone, RefreshCw, Search, Trash2 } from 'lucide-react';
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
import { AdminAttachmentGallery } from '@/features/admin/components/admin-attachment-gallery';
import { useToast } from '@/features/admin/components/admin-toast';
import { bulkMessageAction, deleteMessage, getMessages, markMessageRead, MessageBulkAction } from '@/lib/admin-api';
import { normalizePhone } from '@/lib/phone';
import { AdminContactMessage, ServiceRequestStatus } from '@/types/admin';

const LIMIT = 20;
const SEARCH_DEBOUNCE_MS = 300;

type ReadFilter = 'all' | 'unread' | 'read';
type SortOrder = 'newest' | 'oldest';

const requestStatusTone: Record<ServiceRequestStatus, 'neutral' | 'brand' | 'success' | 'warning' | 'danger'> = {
  pending: 'warning',
  contacted: 'brand',
  confirmed: 'success',
  completed: 'success',
  cancelled: 'danger',
};

export function AdminMessages() {
  const t = useTranslations('admin');
  const { showToast } = useToast();

  const [messages, setMessages] = useState<AdminContactMessage[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const [search, setSearch] = useState('');
  const [appliedSearch, setAppliedSearch] = useState('');
  const [readFilter, setReadFilter] = useState<ReadFilter>('all');
  const [sort, setSort] = useState<SortOrder>('newest');
  const [offset, setOffset] = useState(0);

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [selected, setSelected] = useState<AdminContactMessage | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AdminContactMessage | null>(null);
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const id = window.setTimeout(() => {
      setAppliedSearch(search);
    }, SEARCH_DEBOUNCE_MS);
    return () => window.clearTimeout(id);
  }, [search]);

  const is_read = useMemo<boolean | undefined>(
    () => (readFilter === 'all' ? undefined : readFilter === 'unread' ? false : true),
    [readFilter],
  );

  const fetchPage = useCallback(
    async (options: { silent?: boolean } = {}) => {
      if (!options.silent) setLoading(true);
      setError(false);
      try {
        const res = await getMessages({
          is_read,
          search: appliedSearch || undefined,
          sort,
          limit: LIMIT,
          offset,
        });
        if (res.meta.offset > 0 && res.meta.total > 0 && res.meta.offset >= res.meta.total) {
          setOffset(Math.max(0, Math.floor((res.meta.total - 1) / LIMIT) * LIMIT));
        }
        setMessages(res.data);
        setTotal(res.meta.total);
      } catch {
        setError(true);
      } finally {
        if (!options.silent) setLoading(false);
      }
    },
    [is_read, appliedSearch, sort, offset],
  );

  useEffect(() => {
    setSelectedIds(new Set());
    void fetchPage();
  }, [fetchPage]);

  function clearFilters() {
    setSearch('');
    setAppliedSearch('');
    setReadFilter('all');
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
      const allSelected = messages.length > 0 && messages.every((m) => next.has(m.id));
      messages.forEach((m) => {
        if (allSelected) {
          next.delete(m.id);
        } else {
          next.add(m.id);
        }
      });
      return next;
    });
  }

  async function handleToggleRead(message: AdminContactMessage) {
    const next = !message.is_read;
    setMessages((prev) => prev.map((m) => (m.id === message.id ? { ...m, is_read: next } : m)));
    if (selected?.id === message.id) setSelected({ ...selected, is_read: next });
    try {
      const updated = await markMessageRead(message.id, next);
      setMessages((prev) => prev.map((m) => (m.id === updated.data.id ? updated.data : m)));
      if (selected?.id === message.id) setSelected(updated.data);
      showToast(next ? t('mark_read_done') : t('mark_unread_done'), 'success');
    } catch {
      setMessages((prev) => prev.map((m) => (m.id === message.id ? { ...m, is_read: !next } : m)));
      if (selected?.id === message.id) setSelected({ ...selected, is_read: !next });
      showToast(t('action_failed'), 'error');
    }
  }

  async function handleDelete(target: AdminContactMessage) {
    setBusy(true);
    setDeleteTarget(null);
    setMessages((prev) => prev.filter((m) => m.id !== target.id));
    setTotal((prev) => Math.max(0, prev - 1));
    if (selected?.id === target.id) setSelected(null);
    try {
      await deleteMessage(target.id);
      showToast(t('delete_message_done'), 'success');
    } catch {
      void fetchPage({ silent: true });
      showToast(t('action_failed'), 'error');
    } finally {
      setBusy(false);
    }
  }

  async function handleBulk(action: MessageBulkAction) {
    const ids = [...selectedIds];
    if (!ids.length) return;

    if (action === 'delete') {
      setBusy(true);
      setBulkDeleteOpen(false);
      const removed = messages.filter((m) => selectedIds.has(m.id)).length;
      setMessages((prev) => prev.filter((m) => !selectedIds.has(m.id)));
      setTotal((prev) => Math.max(0, prev - removed));
      setSelectedIds(new Set());
      try {
        const res = await bulkMessageAction(ids, action);
        showToast(t('bulk_delete_done', { count: res.data.processed }), 'success');
      } catch {
        void fetchPage({ silent: true });
        showToast(t('action_failed'), 'error');
      } finally {
        setBusy(false);
      }
      return;
    }

    const next = action === 'mark_read';
    setMessages((prev) => prev.map((m) => (selectedIds.has(m.id) ? { ...m, is_read: next } : m)));
    setSelectedIds(new Set());
    try {
      const res = await bulkMessageAction(ids, action);
      showToast(
        next ? t('bulk_read_done', { count: res.data.processed }) : t('bulk_unread_done', { count: res.data.processed }),
        'success',
      );
    } catch {
      void fetchPage({ silent: true });
      showToast(t('action_failed'), 'error');
    }
  }

  function formatDate(value: string) {
    return new Date(value).toLocaleString();
  }

  const allPageSelected = messages.length > 0 && messages.every((m) => selectedIds.has(m.id));
  const hasActiveFilters = appliedSearch !== '' || readFilter !== 'all';

  return (
    <AdminSection>
      <AdminPageHeader
        eyebrow={t('messages')}
        title={t('messages_title')}
        description={t('messages_description')}
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
        <AdminToolbar className="w-full md:w-auto">
          <AdminSelect
            value={readFilter}
            onChange={(e) => {
              setReadFilter(e.target.value as ReadFilter);
              setOffset(0);
            }}
            aria-label={t('filter_status')}
            className="md:w-auto"
          >
            <option value="all">{t('messages_all')}</option>
            <option value="unread">{t('messages_unread_only')}</option>
            <option value="read">{t('messages_read_only')}</option>
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
            <AdminButton variant="secondary" onClick={() => void handleBulk('mark_read')}>
              <Mail size={16} />
              {t('mark_read')}
            </AdminButton>
            <AdminButton variant="secondary" onClick={() => void handleBulk('mark_unread')}>
              <MailOpen size={16} />
              {t('mark_unread')}
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
      ) : messages.length === 0 ? (
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
          <AdminEmptyState title={t('no_messages')} />
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
              <div className="col-span-4">{t('messages_sender')}</div>
              <div className="col-span-3">{t('messages_contact')}</div>
              <div className="col-span-2">{t('messages_district')}</div>
              <div className="col-span-2">{t('messages_date')}</div>
            </div>
          </AdminTableHeader>
          {messages.map((msg) => (
            <AdminTableRow
              key={msg.id}
              className={msg.is_read ? undefined : 'bg-brand-50/40 dark:bg-brand-900/10'}
            >
              <div className="relative grid grid-cols-[1fr_auto] items-center gap-2 md:grid-cols-12 md:gap-3">
                <div className="absolute start-0 top-1/2 -translate-y-1/2 md:static md:col-span-1 md:translate-y-0">
                  <input
                    type="checkbox"
                    checked={selectedIds.has(msg.id)}
                    onChange={() => toggleSelected(msg.id)}
                    aria-label={t('select_message', { name: msg.name })}
                    className="h-4 w-4 rounded border-neutral-300 accent-brand-500"
                  />
                </div>
                <AdminTableCell className="ps-8 md:col-span-4 md:ps-0">
                  <button
                    type="button"
                    onClick={() => setSelected(msg)}
                    aria-label={`${t('view')}: ${msg.name}`}
                    className="block w-full min-w-0 text-start"
                  >
                    <span className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold text-neutral-950 dark:text-neutral-50">{msg.name}</span>
                      {!msg.is_read && <AdminBadge tone="brand">{t('messages_new')}</AdminBadge>}
                      {msg.service_request && (
                        <AdminBadge tone="brand">
                          <span className="flex items-center gap-1">
                            <ClipboardList size={12} />
                            {msg.service_request.request_number || t('messages_request')}
                          </span>
                        </AdminBadge>
                      )}
                    </span>
                    {msg.message && (
                      <span className="mt-0.5 block truncate text-xs text-neutral-500 dark:text-neutral-400">
                        {msg.message}
                      </span>
                    )}
                  </button>
                </AdminTableCell>
                <AdminTableCell className="hidden md:col-span-3 md:block">
                  <span className="flex items-center gap-1.5">
                    <Phone size={14} className="shrink-0 text-neutral-400" />
                    {msg.phone}
                  </span>
                </AdminTableCell>
                <AdminTableCell className="hidden md:col-span-2 md:block">{msg.district}</AdminTableCell>
                <AdminTableCell className="hidden text-neutral-500 md:col-span-2 md:block">
                  {formatDate(msg.created_at)}
                </AdminTableCell>
                <AdminTableCell className="md:col-span-1">
                  <AdminToolbar className="justify-end">
                    <AdminIconButton onClick={() => setDeleteTarget(msg)} aria-label={t('delete')}>
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
        title={selected?.name}
        description={selected ? formatDate(selected.created_at) : undefined}
        footer={
          selected && (
            <>
              <a
                href={`tel:${selected.phone.replace(/\s+/g, '')}`}
                className="inline-flex items-center gap-2 rounded-xl border border-neutral-200/80 bg-white px-4 py-2.5 text-sm font-semibold text-neutral-800 transition-colors hover:bg-neutral-50 dark:border-neutral-800/80 dark:bg-neutral-900 dark:text-neutral-100 dark:hover:bg-neutral-800"
              >
                <Phone size={16} />
                {t('call')}
              </a>
              <a
                href={`https://wa.me/${normalizePhone(selected.phone).replace('+', '')}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 rounded-xl border border-neutral-200/80 bg-white px-4 py-2.5 text-sm font-semibold text-neutral-800 transition-colors hover:bg-neutral-50 dark:border-neutral-800/80 dark:bg-neutral-900 dark:text-neutral-100 dark:hover:bg-neutral-800"
              >
                <MessageSquare size={16} />
                {t('whatsapp')}
              </a>
              <AdminButton variant="secondary" onClick={() => void handleToggleRead(selected)}>
                {selected.is_read ? <MailOpen size={16} /> : <Mail size={16} />}
                {selected.is_read ? t('mark_unread') : t('mark_read')}
              </AdminButton>
              <AdminButton variant="danger" onClick={() => setDeleteTarget(selected)}>
                <Trash2 size={16} />
                {t('delete')}
              </AdminButton>
            </>
          )
        }
      >
        {selected && (
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <AdminBadge>
                <span className="flex items-center gap-1">
                  <Phone size={12} />
                  {selected.phone}
                </span>
              </AdminBadge>
              {selected.district && <AdminBadge tone="neutral">{selected.district}</AdminBadge>}
              {selected.email && <AdminBadge tone="neutral">{selected.email}</AdminBadge>}
              {!selected.is_read && <AdminBadge tone="brand">{t('messages_new')}</AdminBadge>}
            </div>
            {selected.message ? (
              <p className="whitespace-pre-wrap text-sm leading-6 text-neutral-600 dark:text-neutral-400">
                {selected.message}
              </p>
            ) : (
              <p className="text-sm leading-6 text-neutral-400 dark:text-neutral-500">{t('no_message_content')}</p>
            )}
            {selected.service_request && (
              <div className="space-y-3 rounded-2xl border border-neutral-200/80 p-4 dark:border-neutral-800/80">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="flex items-center gap-1.5 text-sm font-semibold text-neutral-900 dark:text-neutral-100">
                    <ClipboardList size={15} className="text-neutral-400" />
                    {t('messages_request_linked')}
                  </span>
                  {selected.service_request.request_number && (
                    <AdminBadge tone="brand">{selected.service_request.request_number}</AdminBadge>
                  )}
                  <AdminBadge tone={requestStatusTone[selected.service_request.status] ?? 'neutral'}>
                    {t(`sr_status_${selected.service_request.status}`)}
                  </AdminBadge>
                </div>
                <AdminAttachmentGallery attachments={selected.service_request.attachments} label={t('attachments')} />
              </div>
            )}
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
        title={t('bulk_delete_title')}
        description={t('bulk_delete_description', { count: selectedIds.size })}
        confirmLabel={t('bulk_delete')}
        cancelLabel={t('cancel')}
        loading={busy}
        onConfirm={() => void handleBulk('delete')}
      />
    </AdminSection>
  );
}
