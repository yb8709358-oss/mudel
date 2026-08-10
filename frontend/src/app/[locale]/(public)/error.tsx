'use client';

import { Link } from '@/i18n/navigation';
import { useTranslations } from 'next-intl';
import { useSiteSettings } from '@/hooks/use-site-settings';

export default function Error({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useTranslations('common');
  const { primaryPhone } = useSiteSettings();
  return (
    <div className="container-content section-padding text-center">
      <h1 className="text-4xl font-bold mb-4">{t('error_title')}</h1>
      <p className="text-neutral-500 mb-6">{t('error_message')}</p>
      <div className="flex gap-4 justify-center">
        <button
          onClick={reset}
          className="px-6 py-3 rounded-xl bg-brand-500 text-white font-medium hover:bg-brand-600 transition-colors"
        >
          {t('try_again')}
        </button>
        <Link
          href="/"
          className="px-6 py-3 rounded-xl border font-medium hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors"
        >
          {t('back_home')}
        </Link>
      </div>
      {primaryPhone && (
        <p className="mt-6 text-sm text-neutral-400">
          {t('call_us')} <a href={primaryPhone.url} className="text-brand-500">{primaryPhone.display}</a>
        </p>
      )}
    </div>
  );
}
