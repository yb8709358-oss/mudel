'use client';

import { usePathname, useRouter } from '@/i18n/navigation';
import { routing } from '@/i18n/routing';
import { localeNames } from '@/i18n/config';
import { useTransition } from 'react';
import { useParams } from 'next/navigation';

export function LanguageSwitcher() {
  const pathname = usePathname();
  const router = useRouter();
  const params = useParams();
  const [isPending, startTransition] = useTransition();

  const currentLocale = params.locale as string;

  function switchLocale(nextLocale: string) {
    startTransition(() => {
      router.replace(pathname, { locale: nextLocale });
    });
  }

  return (
    <div className="flex items-center gap-1">
      {routing.locales.map((locale) => (
        <button
          key={locale}
          onClick={() => switchLocale(locale)}
          disabled={isPending || locale === currentLocale}
          className={`px-2 py-1 text-sm rounded-md transition-colors ${
            locale === currentLocale
              ? 'bg-brand-500 text-white'
              : 'text-neutral-600 hover:text-brand-600 dark:text-neutral-400 dark:hover:text-brand-400'
          } disabled:opacity-50`}
          aria-label={`Switch to ${localeNames[locale]}`}
        >
          {localeNames[locale]}
        </button>
      ))}
    </div>
  );
}
