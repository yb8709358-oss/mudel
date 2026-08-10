'use client';

import { useCallback, useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { ArrowRight, RefreshCw } from 'lucide-react';
import {
  AdminBadge,
  AdminButton,
  AdminCard,
  AdminEmptyState,
  AdminPageHeader,
  AdminSection,
  AdminSkeleton,
  AdminStatCard,
} from '@/features/admin/components/admin-ui';
import { Link } from '@/i18n/navigation';
import { getDashboard, getMessages, getServiceRequests } from '@/lib/admin-api';
import { AdminContactMessage, AdminDashboardSummary, AdminServiceRequest } from '@/types/admin';

const statusTone: Record<string, 'neutral' | 'brand' | 'success' | 'warning' | 'danger'> = {
  pending: 'warning',
  contacted: 'brand',
  confirmed: 'success',
  completed: 'success',
  cancelled: 'danger',
};

export function AdminDashboard() {
  const t = useTranslations('admin');
  const [data, setData] = useState<AdminDashboardSummary | null>(null);
  const [recent, setRecent] = useState<AdminServiceRequest[]>([]);
  const [messages, setMessages] = useState<AdminContactMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const load = useCallback(async (options: { silent?: boolean } = {}) => {
    if (!options.silent) setLoading(true);
    setError(false);
    try {
      const [summary, requests, recentMessages] = await Promise.all([
        getDashboard(),
        getServiceRequests({ limit: 5 }),
        getMessages({ limit: 5 }),
      ]);
      setData(summary.data);
      setRecent(requests.data);
      setMessages(recentMessages.data);
    } catch {
      if (!options.silent) setError(true);
    } finally {
      if (!options.silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) {
    return (
      <AdminSection>
        <AdminPageHeader eyebrow={t('overview')} title={t('dashboard_title')} description={t('dashboard_description')} />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <AdminSkeleton key={i} className="h-28 rounded-2xl" />
          ))}
        </div>
      </AdminSection>
    );
  }

  if (error || !data) {
    return (
      <AdminSection>
        <AdminEmptyState
          title={t('error_loading')}
          description={t('error_loading_description')}
          action={
            <AdminButton variant="secondary" onClick={() => void load()}>
              <RefreshCw size={16} />
              {t('retry')}
            </AdminButton>
          }
        />
      </AdminSection>
    );
  }

  const statuses = data.service_requests_by_status;

  function serviceName(request: AdminServiceRequest) {
    const name = request.service?.translations?.find((tr) => tr.locale === 'fr')?.name;
    return name || request.service?.slug || '—';
  }

  function formatDate(value: string) {
    return new Date(value).toLocaleDateString();
  }

  return (
    <AdminSection>
      <AdminPageHeader eyebrow={t('overview')} title={t('dashboard_title')} description={t('dashboard_description')} />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <AdminStatCard label={t('stat_services')} value={data.services} />
        <AdminStatCard label={t('stat_technicians')} value={data.technicians} />
        <AdminStatCard label={t('stat_districts')} value={data.districts} />
        <AdminStatCard label={t('stat_messages')} value={data.contact_messages} />
        <AdminStatCard label={t('stat_unread')} value={data.contact_unread} />
        <AdminStatCard label={t('stat_requests')} value={data.service_requests} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <AdminCard className="p-6 sm:p-8">
          <h3 className="text-base font-semibold text-neutral-950 dark:text-neutral-50">{t('status_breakdown')}</h3>
          <div className="mt-5 space-y-4">
            {statuses.map((item) => {
              const max = Math.max(1, ...statuses.map((s) => s.count));
              const width = Math.round((item.count / max) * 100);
              return (
                <div key={item.status} className="flex items-center gap-3">
                  <AdminBadge tone={statusTone[item.status] ?? 'neutral'} className="w-28 justify-center">
                    {t(`sr_status_${item.status}`)}
                  </AdminBadge>
                  <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-neutral-100 dark:bg-neutral-800">
                    <div
                      className="h-full rounded-full bg-brand-500 transition-all duration-500"
                      style={{ width: `${width}%` }}
                    />
                  </div>
                  <span className="w-8 text-end text-sm font-semibold text-neutral-700 dark:text-neutral-300">
                    {item.count}
                  </span>
                </div>
              );
            })}
          </div>
        </AdminCard>

        <AdminCard className="p-6 sm:p-8">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-base font-semibold text-neutral-950 dark:text-neutral-50">{t('recent_requests')}</h3>
            <Link
              href="/admin/service-requests"
              className="inline-flex items-center gap-1 text-sm font-semibold text-brand-600 outline-none hover:underline focus-visible:ring-2 focus-visible:ring-brand-500/40 dark:text-brand-400"
            >
              {t('view_all')}
              <ArrowRight size={14} className="rtl:rotate-180" />
            </Link>
          </div>
          <div className="mt-5 space-y-1">
            {recent.length === 0 ? (
              <p className="text-sm text-neutral-500 dark:text-neutral-400">{t('sr_no_requests')}</p>
            ) : (
              recent.map((request) => (
                <div
                  key={request.id}
                  className="flex items-center justify-between gap-3 rounded-xl px-2 py-2.5 hover:bg-neutral-50 dark:hover:bg-neutral-900/60"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-neutral-900 dark:text-neutral-100">
                      {request.customer_name}
                    </p>
                    <p className="truncate text-xs text-neutral-500">{serviceName(request)}</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <span className="text-xs text-neutral-400">{formatDate(request.created_at)}</span>
                    <AdminBadge tone={statusTone[request.status] ?? 'neutral'}>
                      {t(`sr_status_${request.status}`)}
                    </AdminBadge>
                  </div>
                </div>
              ))
            )}
          </div>
        </AdminCard>

        <AdminCard className="p-6 sm:p-8">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-base font-semibold text-neutral-950 dark:text-neutral-50">{t('recent_messages')}</h3>
            <Link
              href="/admin/messages"
              className="inline-flex items-center gap-1 text-sm font-semibold text-brand-600 outline-none hover:underline focus-visible:ring-2 focus-visible:ring-brand-500/40 dark:text-brand-400"
            >
              {t('view_all')}
              <ArrowRight size={14} className="rtl:rotate-180" />
            </Link>
          </div>
          <div className="mt-5 space-y-1">
            {messages.length === 0 ? (
              <p className="text-sm text-neutral-500 dark:text-neutral-400">{t('no_messages')}</p>
            ) : (
              messages.map((message) => (
                <div
                  key={message.id}
                  className="flex items-center justify-between gap-3 rounded-xl px-2 py-2.5 hover:bg-neutral-50 dark:hover:bg-neutral-900/60"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-neutral-900 dark:text-neutral-100">
                      {message.name}
                    </p>
                    <p className="truncate text-xs text-neutral-500">{message.message || message.phone}</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <span className="text-xs text-neutral-400">{formatDate(message.created_at)}</span>
                    {!message.is_read && (
                      <span className="inline-flex h-2 w-2 rounded-full bg-brand-500" aria-label={t('unread')} />
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </AdminCard>
      </div>
    </AdminSection>
  );
}
