'use client';

import { useEffect, useState } from 'react';
import { resolveSiteSettings, type SiteSettings } from '@/lib/site-settings';

export type SiteSettingsState = SiteSettings & { loading: boolean };

// Module-level cache shared across error boundaries so the settings endpoint
// is fetched at most once per session.
let cached: Record<string, string> | null = null;
let inflight: Promise<Record<string, string>> | null = null;

function fetchSiteSettings(): Promise<Record<string, string>> {
  if (cached) return Promise.resolve(cached);
  if (!inflight) {
    inflight = fetch('/api/public/settings', { cache: 'no-store' })
      .then(async (res) => {
        if (!res.ok) return {};
        const body = (await res.json()) as { data?: Record<string, string> };
        return body?.data ?? {};
      })
      .catch(() => ({}))
      .then((data) => {
        cached = data;
        inflight = null;
        return data;
      });
  }
  return inflight;
}

/**
 * Provides the site settings (site name, contact email, phones, WhatsApp,
 * address, hours, socials) for client components. Values always come from the
 * backend settings store; until they load, an empty map is resolved so
 * components show safe defaults and hide unconfigured contact items.
 */
export function useSiteSettings(): SiteSettingsState {
  const [settings, setSettings] = useState<Record<string, string> | null>(cached);

  useEffect(() => {
    let active = true;
    void fetchSiteSettings().then((data) => {
      if (active) setSettings(data);
    });
    return () => {
      active = false;
    };
  }, []);

  return { ...resolveSiteSettings(settings ?? {}), loading: settings === null };
}
