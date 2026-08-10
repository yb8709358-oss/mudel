'use client';

import { useCallback, useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { RefreshCw, Save } from 'lucide-react';
import {
  AdminButton,
  AdminEmptyState,
  AdminInput,
  AdminLabel,
  AdminPageHeader,
  AdminSection,
  AdminSkeleton,
} from '@/features/admin/components/admin-ui';
import { useToast } from '@/features/admin/components/admin-toast';
import { getSettings, updateSettings } from '@/lib/admin-api';

const SETTINGS_KEYS = [
  'site_name',
  'site_tagline',
  'contact_email',
  'contact_phone',
  'support_phone',
  'address',
  'whatsapp_number',
  'facebook_url',
  'instagram_url',
  'working_hours',
] as const;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function AdminSettings() {
  const t = useTranslations('admin');
  const { showToast } = useToast();

  const [values, setValues] = useState<Record<string, string>>({});
  const [original, setOriginal] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async (options: { silent?: boolean } = {}) => {
    if (!options.silent) setLoading(true);
    setError(false);
    try {
      const res = await getSettings();
      const data = res.data ?? {};
      setValues(data);
      setOriginal(data);
    } catch {
      if (!options.silent) setError(true);
    } finally {
      if (!options.silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const dirty = SETTINGS_KEYS.some((key) => (values[key] ?? '').trim() !== (original[key] ?? '').trim());

  async function handleSave() {
    const email = (values.contact_email ?? '').trim();
    if (email && !EMAIL_RE.test(email)) {
      showToast(t('settings_invalid_email'), 'error');
      return;
    }
    setSaving(true);
    try {
      const payload: Record<string, string> = {};
      for (const key of SETTINGS_KEYS) {
        payload[key] = (values[key] ?? '').trim();
      }
      const res = await updateSettings(payload);
      setValues(res.data ?? {});
      setOriginal(res.data ?? {});
      showToast(t('settings_saved'), 'success');
    } catch {
      showToast(t('action_failed'), 'error');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <AdminSection>
        <AdminPageHeader eyebrow={t('settings')} title={t('settings_title')} description={t('settings_description')} />
        <div className="grid gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <AdminSkeleton key={i} className="h-16 rounded-2xl" />
          ))}
        </div>
      </AdminSection>
    );
  }

  if (error) {
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

  return (
    <AdminSection>
      <AdminPageHeader
        eyebrow={t('settings')}
        title={t('settings_title')}
        description={t('settings_description')}
        actions={
          <AdminButton onClick={handleSave} disabled={saving || !dirty}>
            <Save size={16} />
            {saving ? t('loading') : t('settings_save')}
          </AdminButton>
        }
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-4">
          <div className="space-y-1.5">
            <AdminLabel htmlFor="st-site-name">{t('settings_site_name')}</AdminLabel>
            <AdminInput
              id="st-site-name"
              value={values.site_name ?? ''}
              onChange={(e) => setValues({ ...values, site_name: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <AdminLabel htmlFor="st-tagline">{t('settings_site_tagline')}</AdminLabel>
            <AdminInput
              id="st-tagline"
              value={values.site_tagline ?? ''}
              onChange={(e) => setValues({ ...values, site_tagline: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <AdminLabel htmlFor="st-address">{t('settings_address')}</AdminLabel>
            <AdminInput
              id="st-address"
              value={values.address ?? ''}
              onChange={(e) => setValues({ ...values, address: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <AdminLabel htmlFor="st-hours">{t('settings_working_hours')}</AdminLabel>
            <AdminInput
              id="st-hours"
              value={values.working_hours ?? ''}
              onChange={(e) => setValues({ ...values, working_hours: e.target.value })}
            />
          </div>
        </div>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <AdminLabel htmlFor="st-email">{t('settings_contact_email')}</AdminLabel>
            <AdminInput
              id="st-email"
              type="email"
              value={values.contact_email ?? ''}
              onChange={(e) => setValues({ ...values, contact_email: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <AdminLabel htmlFor="st-phone">{t('settings_contact_phone')}</AdminLabel>
            <AdminInput
              id="st-phone"
              value={values.contact_phone ?? ''}
              onChange={(e) => setValues({ ...values, contact_phone: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <AdminLabel htmlFor="st-support">{t('settings_support_phone')}</AdminLabel>
            <AdminInput
              id="st-support"
              value={values.support_phone ?? ''}
              onChange={(e) => setValues({ ...values, support_phone: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <AdminLabel htmlFor="st-whatsapp">{t('settings_whatsapp_number')}</AdminLabel>
            <AdminInput
              id="st-whatsapp"
              value={values.whatsapp_number ?? ''}
              onChange={(e) => setValues({ ...values, whatsapp_number: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <AdminLabel htmlFor="st-facebook">{t('settings_facebook_url')}</AdminLabel>
            <AdminInput
              id="st-facebook"
              value={values.facebook_url ?? ''}
              onChange={(e) => setValues({ ...values, facebook_url: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <AdminLabel htmlFor="st-instagram">{t('settings_instagram_url')}</AdminLabel>
            <AdminInput
              id="st-instagram"
              value={values.instagram_url ?? ''}
              onChange={(e) => setValues({ ...values, instagram_url: e.target.value })}
            />
          </div>
        </div>
      </div>
    </AdminSection>
  );
}
