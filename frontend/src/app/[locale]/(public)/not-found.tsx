'use client';

import { Link } from '@/i18n/navigation';
import { useTranslations } from 'next-intl';

export default function NotFound() {
  const t = useTranslations('common');
  return (
    <div className="container-content section-padding text-center">
      <h1 className="text-4xl font-bold mb-4">{t('not_found_title')}</h1>
      <p className="text-neutral-500 mb-6">{t('not_found_message')}</p>
      <Link
        href="/"
        className="inline-flex px-6 py-3 rounded-xl bg-brand-500 text-white font-medium hover:bg-brand-600 transition-colors"
      >
        {t('back_home')}
      </Link>
    </div>
  );
}
