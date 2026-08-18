'use client';

import { useTranslations, useLocale } from 'next-intl';
import { Link, usePathname } from '@/i18n/navigation';
import { Wrench, ArrowRight } from 'lucide-react';

export function FloatingCta() {
  const t = useTranslations('common');
  const pathname = usePathname();
  const locale = useLocale();

  const contactPath = `/${locale}/contact`;
  const isContactPage =
    pathname === contactPath || pathname === `${contactPath}/`;

  if (isContactPage) return null;

  return (
    <Link
      href="/contact"
      aria-label={t('floating_cta_label')}
      className="floating-cta fixed z-40 bottom-5 right-4 sm:right-5 inline-flex items-center gap-2 px-5 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] rounded-full bg-brand-500 text-white font-semibold text-sm shadow-lg shadow-brand-500/20 hover:bg-brand-600 hover:shadow-xl hover:shadow-brand-500/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 md:hidden min-h-[44px] min-w-[44px]"
    >
      <Wrench size={16} strokeWidth={2.5} aria-hidden="true" />
      <span className="hidden min-[380px]:inline whitespace-nowrap">
        {t('floating_cta_label')}
      </span>
      <ArrowRight size={16} strokeWidth={2.5} aria-hidden="true" />
    </Link>
  );
}
