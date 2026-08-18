import type { Metadata } from 'next';
import { Inter, Noto_Kufi_Arabic } from 'next/font/google';
import { NextIntlClientProvider } from 'next-intl';
import { getMessages, getTranslations, setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { routing } from '@/i18n/routing';
import { SITE_URL } from '@/lib/env';
import { Providers } from '@/components/providers';
import { ReactNode } from 'react';
import '../globals.css';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

const notoKufi = Noto_Kufi_Arabic({
  subsets: ['arabic'],
  variable: '--font-noto-kufi',
  display: 'swap',
});

// Canonical site origin. Same env var source used by app/robots.ts and
// app/sitemap.ts so canonical, Open Graph and sitemap URLs stay consistent.

const LOGO_PATH = '/images/icons/mudel-logo.png';

// Open Graph locale codes for the site's supported languages.
const OG_LOCALES: Record<string, string> = {
  en: 'en_US',
  fr: 'fr_FR',
  ar: 'ar_MA',
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: 'metadata' });

  const ogLocale = OG_LOCALES[locale] ?? 'en_US';
  const ogAlternates = Object.values(OG_LOCALES).filter((l) => l !== ogLocale);

  return {
    metadataBase: new URL(SITE_URL),
    title: {
      default: t('title'),
      template: t('template'),
    },
    description: t('description'),
    icons: {
      icon: [{ url: LOGO_PATH, type: 'image/png', sizes: 'any' }],
      apple: [{ url: LOGO_PATH, type: 'image/png', sizes: 'any' }],
    },
    alternates: {
      canonical: `/${locale}`,
      languages: {
        en: '/en',
        fr: '/fr',
        ar: '/ar',
      },
    },
    robots: {
      index: true,
      follow: true,
    },
    openGraph: {
      type: 'website',
      locale: ogLocale,
      siteName: 'Mudel',
      url: `/${locale}`,
      title: t('title'),
      description: t('description'),
      images: [
        {
          url: LOGO_PATH,
          width: 1536,
          height: 1024,
          alt: 'Mudel',
        },
      ],
    },
    twitter: {
      card: 'summary',
      title: t('title'),
      description: t('description'),
      images: [LOGO_PATH],
    },
  };
}

type Props = {
  children: ReactNode;
  params: Promise<{ locale: string }>;
};

export async function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({ children, params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  if (!routing.locales.includes(locale as 'en' | 'fr' | 'ar')) {
    notFound();
  }

  const messages = await getMessages();

  return (
    <html
      lang={locale}
      dir={locale === 'ar' ? 'rtl' : 'ltr'}
      suppressHydrationWarning
      className={`${inter.variable} ${notoKufi.variable}`}
    >
      <body>
        <NextIntlClientProvider messages={messages}>
          <Providers>{children}</Providers>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
