'use client';

import { ReactNode, useState } from 'react';
import {
  ClipboardList,
  ExternalLink,
  Home,
  Inbox,
  LayoutDashboard,
  LogOut,
  MapPin,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  Settings,
  ShieldCheck,
  Users,
  Wrench,
  X,
} from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { Link, usePathname, useRouter } from '@/i18n/navigation';
import { LanguageSwitcher } from '@/components/layout/language-switcher';
import { ThemeToggle } from '@/components/layout/theme-toggle';
import { AdminAvatar } from '@/features/admin/components/admin-ui';
import { cn } from '@/lib/utils';

type AdminShellProps = {
  children: ReactNode;
};

const adminNavItems = [
  { href: '/admin', labelKey: 'overview', icon: LayoutDashboard, available: true },
  { href: '/admin/messages', labelKey: 'messages', icon: Inbox, available: true },
  { href: '/admin/service-requests', labelKey: 'service_requests', icon: ClipboardList, available: true },
  { href: '/admin/services', labelKey: 'services', icon: Wrench, available: true },
  { href: '/admin/technicians', labelKey: 'technicians', icon: Users, available: true },
  { href: '/admin/districts', labelKey: 'districts', icon: MapPin, available: true },
  { href: '/admin/settings', labelKey: 'settings', icon: Settings, available: true },
];

export function AdminShell({ children }: AdminShellProps) {
  const t = useTranslations('admin');
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  async function handleSignOut() {
    try {
      await fetch('/api/admin/logout', { method: 'POST' });
    } catch {
      // proceed with local redirect regardless
    }
    router.replace('/admin/login');
    router.refresh();
  }

  function renderSidebar(isCollapsed: boolean, isMobile = false) {
    return (
      <aside className="flex h-full flex-col border-e border-neutral-200/80 bg-white/95 shadow-[1px_0_0_rgba(255,255,255,0.7)_inset] backdrop-blur-xl transition-[width,background-color,border-color] duration-300 ease-out dark:border-neutral-800/80 dark:bg-neutral-950/95 dark:shadow-none">
        <div
          className={cn(
            'flex h-16 items-center border-b border-neutral-200/80 px-3 dark:border-neutral-800/80',
            isCollapsed ? 'justify-center' : 'justify-between',
          )}
        >
          <Link
            href="/admin"
            className={cn(
              'group flex items-center gap-3 rounded-2xl font-bold text-brand-600 outline-none transition-transform duration-200 hover:scale-[1.01] focus-visible:ring-2 focus-visible:ring-brand-500/40 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-neutral-950',
              isCollapsed && 'justify-center',
            )}
            title={isCollapsed ? t('dashboard') : undefined}
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-brand-500 text-white shadow-sm shadow-brand-500/20 transition-shadow duration-200 group-hover:shadow-md group-hover:shadow-brand-500/25">
              <LayoutDashboard size={18} />
            </span>
            {!isCollapsed && (
              <span className="min-w-0 leading-tight">
                <span className="block truncate text-sm text-neutral-950 dark:text-neutral-50">Mudel</span>
                <span className="block truncate text-xs font-medium text-neutral-500 dark:text-neutral-500">
                  {t('dashboard')}
                </span>
              </span>
            )}
          </Link>

          {isMobile ? (
            <button
              type="button"
              onClick={() => setMobileOpen(false)}
              className="rounded-xl p-2 text-neutral-500 outline-none transition-colors hover:bg-neutral-100 hover:text-neutral-800 focus-visible:ring-2 focus-visible:ring-brand-500/40 dark:hover:bg-neutral-900 dark:hover:text-neutral-200"
              aria-label={t('close_menu')}
            >
              <X size={20} />
            </button>
          ) : (
            !isCollapsed && (
              <button
                type="button"
                onClick={() => setCollapsed(true)}
                className="hidden rounded-xl p-2 text-neutral-500 outline-none transition-colors hover:bg-neutral-100 hover:text-neutral-800 focus-visible:ring-2 focus-visible:ring-brand-500/40 dark:hover:bg-neutral-900 dark:hover:text-neutral-200 lg:inline-flex"
                aria-label={t('collapse_sidebar')}
              >
                <PanelLeftClose size={18} />
              </button>
            )
          )}
        </div>

        <nav className="flex-1 space-y-1.5 p-2.5" aria-label={t('dashboard_navigation')}>
          {adminNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href || pathname.endsWith(item.href);
            const className = cn(
              'group relative flex w-full items-center rounded-2xl text-sm font-medium outline-none transition-all duration-200 ease-out',
              isCollapsed ? 'justify-center px-2 py-3' : 'gap-3 px-3 py-2.5',
              isActive
                ? 'bg-white text-neutral-950 shadow-sm ring-1 ring-neutral-200/70 dark:bg-neutral-900 dark:text-neutral-50 dark:ring-neutral-800'
                : 'text-neutral-600 hover:-translate-y-0.5 hover:bg-white hover:text-neutral-950 hover:shadow-sm hover:ring-1 hover:ring-neutral-200/70 dark:text-neutral-400 dark:hover:bg-neutral-900 dark:hover:text-neutral-100 dark:hover:ring-neutral-800',
              item.available && 'focus-visible:ring-2 focus-visible:ring-brand-500/40 focus-visible:ring-offset-2 focus-visible:ring-offset-neutral-50 dark:focus-visible:ring-offset-neutral-950',
              !item.available && 'cursor-not-allowed opacity-55 hover:translate-y-0 hover:bg-transparent hover:shadow-none hover:ring-0 dark:hover:bg-transparent',
            );

            const content = (
              <>
                {isActive && (
                  <span
                    className={cn(
                      'absolute rounded-full bg-brand-500 shadow-sm shadow-brand-500/30',
                      isCollapsed ? 'bottom-1 h-1 w-5' : 'inset-y-2 start-0 w-1',
                    )}
                  />
                )}
                <span
                  className={cn(
                    'flex h-8 w-8 shrink-0 items-center justify-center rounded-xl transition-colors duration-200',
                    isActive
                      ? 'bg-brand-50 text-brand-600 dark:bg-brand-900/25 dark:text-brand-300'
                      : 'text-neutral-500 group-hover:bg-neutral-100 group-hover:text-brand-600 dark:text-neutral-500 dark:group-hover:bg-neutral-800 dark:group-hover:text-brand-300',
                  )}
                >
                  <Icon size={17} />
                </span>
                {!isCollapsed && <span className="min-w-0 flex-1 truncate">{t(item.labelKey)}</span>}
              </>
            );

            if (!item.available) {
              return (
                <span
                  key={item.href}
                  className={className}
                  aria-disabled="true"
                  title={isCollapsed ? t(item.labelKey) : undefined}
                >
                  {content}
                </span>
              );
            }

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className={className}
                aria-current={isActive ? 'page' : undefined}
                title={isCollapsed ? t(item.labelKey) : undefined}
              >
                {content}
              </Link>
            );
          })}
        </nav>

        <div className="space-y-2.5 border-t border-neutral-200/80 p-2.5 dark:border-neutral-800/80">
          {!isCollapsed && (
            <div className="rounded-2xl border border-neutral-200/80 bg-neutral-50/80 p-3 dark:border-neutral-800/80 dark:bg-neutral-900/50">
              <div className="flex items-center gap-3">
                <AdminAvatar label={t('admin_account')} />
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-neutral-900 dark:text-neutral-100">
                    {t('admin_account')}
                  </p>
                  <p className="truncate text-xs text-neutral-500 dark:text-neutral-500">
                    {t('protected_session')}
                  </p>
                </div>
              </div>
            </div>
          )}
          {isCollapsed && !isMobile && (
            <button
              type="button"
              onClick={() => setCollapsed(false)}
              className="flex w-full items-center justify-center rounded-2xl p-3 text-neutral-500 outline-none transition-colors hover:bg-white hover:text-neutral-900 focus-visible:ring-2 focus-visible:ring-brand-500/40 dark:hover:bg-neutral-900 dark:hover:text-neutral-100"
              aria-label={t('expand_sidebar')}
            >
              <PanelLeftOpen size={18} />
            </button>
          )}
          <Link
            href="/"
            className={cn(
              'group flex items-center rounded-2xl text-sm font-medium text-neutral-600 outline-none transition-all duration-200 hover:-translate-y-0.5 hover:bg-white hover:text-brand-700 hover:shadow-sm hover:ring-1 hover:ring-neutral-200/70 focus-visible:ring-2 focus-visible:ring-brand-500/40 focus-visible:ring-offset-2 focus-visible:ring-offset-neutral-50 dark:text-neutral-400 dark:hover:bg-neutral-900 dark:hover:text-brand-300 dark:hover:ring-neutral-800 dark:focus-visible:ring-offset-neutral-950',
              isCollapsed ? 'justify-center p-3' : 'gap-3 px-3 py-2.5',
            )}
            title={isCollapsed ? t('back_to_site') : undefined}
          >
            <Home size={18} />
            {!isCollapsed && <span className="flex-1">{t('back_to_site')}</span>}
            {!isCollapsed && (
              <ExternalLink size={15} className="text-neutral-400 transition-transform group-hover:translate-x-0.5 rtl:group-hover:-translate-x-0.5" />
            )}
          </Link>
          <button
            type="button"
            onClick={handleSignOut}
            className={cn(
              'flex w-full items-center rounded-2xl text-sm font-medium text-neutral-600 outline-none transition-all duration-200 hover:-translate-y-0.5 hover:bg-white hover:text-red-600 hover:shadow-sm hover:ring-1 hover:ring-neutral-200/70 focus-visible:ring-2 focus-visible:ring-brand-500/40 focus-visible:ring-offset-2 focus-visible:ring-offset-neutral-50 dark:text-neutral-400 dark:hover:bg-neutral-900 dark:hover:text-red-400 dark:hover:ring-neutral-800 dark:focus-visible:ring-offset-neutral-950',
              isCollapsed ? 'justify-center p-3' : 'gap-3 px-3 py-2.5',
            )}
            title={isCollapsed ? t('sign_out') : undefined}
          >
            <LogOut size={18} />
            {!isCollapsed && <span className="flex-1">{t('sign_out')}</span>}
          </button>
        </div>
      </aside>
    );
  }

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#fafaf9_0%,#f5f4f2_100%)] text-neutral-900 dark:bg-[linear-gradient(180deg,#161510_0%,#0f0e0c_100%)] dark:text-neutral-50">
      <div
        className={cn(
          'transition-[grid-template-columns] duration-300 ease-out lg:grid lg:min-h-screen',
          collapsed ? 'lg:grid-cols-[88px_1fr]' : 'lg:grid-cols-[288px_1fr]',
        )}
      >
        <div className="hidden lg:block">{renderSidebar(collapsed)}</div>

        {mobileOpen && (
          <div className="fixed inset-0 z-[60] lg:hidden">
            <button
              type="button"
              className="absolute inset-0 bg-neutral-950/45 backdrop-blur-[2px] transition-opacity"
              onClick={() => setMobileOpen(false)}
              aria-label={t('close_menu')}
            />
            <div className="relative h-full w-[min(336px,88vw)] animate-slide-up shadow-2xl shadow-black/25">
              {renderSidebar(false, true)}
            </div>
          </div>
        )}

        <div className="flex min-w-0 flex-col">
          <header className="sticky top-0 z-40 border-b border-neutral-200/80 bg-white/75 shadow-[0_1px_0_rgba(255,255,255,0.75)_inset] backdrop-blur-xl dark:border-neutral-800/80 dark:bg-neutral-950/70 dark:shadow-none">
            <div className="flex min-h-16 items-center justify-between gap-3 px-4 py-3 sm:px-6 lg:px-8">
              <div className="flex min-w-0 items-center gap-3">
                <button
                  type="button"
                  onClick={() => setMobileOpen(true)}
                  className="rounded-xl p-2 text-neutral-600 outline-none transition-colors hover:bg-neutral-100 hover:text-neutral-900 focus-visible:ring-2 focus-visible:ring-brand-500/40 dark:text-neutral-400 dark:hover:bg-neutral-900 dark:hover:text-neutral-100 lg:hidden"
                  aria-label={t('open_menu')}
                >
                  <Menu size={22} />
                </button>
                <div className="min-w-0">
                  <div className="mb-0.5 flex items-center gap-2 text-xs font-medium text-neutral-500 dark:text-neutral-500">
                    <ShieldCheck size={14} className="text-brand-600 dark:text-brand-400" />
                    <span>{t('protected_session')}</span>
                  </div>
                  <h1 className="truncate text-xl font-semibold tracking-tight text-neutral-950 dark:text-neutral-50 sm:text-2xl">
                    {t('title')}
                  </h1>
                </div>
              </div>

              <div className="flex min-w-0 items-center justify-end gap-2 sm:gap-3">
                <div className="hidden rounded-full border border-neutral-200/80 bg-white/70 px-1 py-1 shadow-sm shadow-black/[0.02] dark:border-neutral-800/80 dark:bg-neutral-900/70 sm:block">
                  <LanguageSwitcher />
                </div>
                <div className="rounded-full border border-neutral-200/80 bg-white/70 shadow-sm shadow-black/[0.02] dark:border-neutral-800/80 dark:bg-neutral-900/70">
                  <ThemeToggle />
                </div>
                <span className="hidden rounded-full border border-neutral-200/80 bg-white/70 px-3 py-1.5 text-xs font-semibold text-neutral-500 shadow-sm shadow-black/[0.02] dark:border-neutral-800/80 dark:bg-neutral-900/70 dark:text-neutral-400 md:inline-flex">
                  {locale.toUpperCase()}
                </span>
              </div>
            </div>
          </header>

          <main className="flex-1 px-4 py-6 sm:px-6 sm:py-8 lg:px-8 lg:py-10">
            <div className="mx-auto w-full max-w-7xl animate-fade-in">{children}</div>
          </main>
        </div>
      </div>
    </div>
  );
}
