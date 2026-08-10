'use client';

import { useTranslations, useLocale } from 'next-intl';
import { Link, usePathname } from '@/i18n/navigation';
import { LanguageSwitcher } from './language-switcher';
import { ThemeToggle } from './theme-toggle';
import { Menu, X } from 'lucide-react';
import Image from 'next/image';
import { useEffect, useRef, useState } from 'react';
import { useSiteSettings } from '@/hooks/use-site-settings';

export function Header() {
  const t = useTranslations('nav');
  const pathname = usePathname();
  const locale = useLocale();
  const { siteName } = useSiteSettings();
  const [mobileOpen, setMobileOpen] = useState(false);
  const menuButtonRef = useRef<HTMLButtonElement>(null);

  const links = [
    { href: '/', label: t('home') },
    { href: '/services', label: t('services') },
    { href: '/contact', label: t('contact') },
  ];

  function isActive(href: string) {
    if (href === '/') return pathname === `/${locale}` || pathname === `/${locale}/`;
    return pathname.startsWith(`/${locale}${href}`);
  }

  useEffect(() => {
    if (!mobileOpen) return;

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setMobileOpen(false);
        menuButtonRef.current?.focus();
      }
    }
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [mobileOpen]);

  return (
    <header className="sticky top-0 z-50 border-b bg-white/80 backdrop-blur-md dark:bg-neutral-900/80">
      <div className="container-content flex h-16 items-center justify-between">
        <Link href="/" className="flex items-center gap-2 text-xl font-bold text-brand-600">
          <Image
            src="/images/icons/mudel-logo.png"
            alt={siteName}
            width={24}
            height={16}
            className="h-6 w-auto"
          />
          <span>{siteName}</span>
        </Link>

        <nav className="hidden md:flex items-center gap-6" aria-label={t('open_menu')}>
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`text-sm font-medium transition-colors ${
                isActive(link.href)
                  ? 'text-brand-600 dark:text-brand-400'
                  : 'text-neutral-600 hover:text-brand-600 dark:text-neutral-400 dark:hover:text-brand-400'
              }`}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="hidden md:flex items-center gap-2">
          <LanguageSwitcher />
          <ThemeToggle />
        </div>

        <button
          ref={menuButtonRef}
          onClick={() => setMobileOpen(!mobileOpen)}
          className="md:hidden p-2 text-neutral-600 dark:text-neutral-400"
          aria-label={mobileOpen ? t('close_menu') : t('open_menu')}
          aria-expanded={mobileOpen}
          aria-controls="mobile-menu"
        >
          {mobileOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {mobileOpen && (
        <div id="mobile-menu" className="md:hidden border-t bg-white dark:bg-neutral-900 p-4">
          <nav className="flex flex-col gap-3 mb-4" aria-label={t('open_menu')}>
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileOpen(false)}
                className={`text-sm font-medium ${
                  isActive(link.href)
                    ? 'text-brand-600'
                    : 'text-neutral-600'
                }`}
              >
                {link.label}
              </Link>
            ))}
          </nav>
          <div className="flex items-center gap-2 pt-3 border-t">
            <LanguageSwitcher />
            <ThemeToggle />
          </div>
        </div>
      )}
    </header>
  );
}
