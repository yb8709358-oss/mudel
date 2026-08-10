import { useTranslations } from 'next-intl';
import Image from 'next/image';
import { Link } from '@/i18n/navigation';
import type { SiteSettings } from '@/lib/site-settings';

export function Footer({ settings }: { settings: SiteSettings }) {
  const t = useTranslations('footer');

  return (
    <footer className="border-t bg-neutral-50 dark:bg-neutral-900">
      <div className="container-content py-12">
        <div className="grid gap-8 md:grid-cols-3">
          <div>
            <div className="flex items-center gap-2 text-xl font-bold text-brand-600 mb-3">
              <Image
                src="/images/icons/mudel-logo.png"
                alt={settings.siteName}
                width={24}
                height={16}
                className="h-6 w-auto"
              />
              <span>{settings.siteName}</span>
            </div>
            <p className="text-sm text-neutral-600 dark:text-neutral-400">
              {settings.siteTagline || t('description')}
            </p>
          </div>

          <div>
            <h3 className="font-semibold mb-3 text-sm uppercase tracking-wider text-neutral-500">
              {t('popular_services')}
            </h3>
            <ul className="space-y-2 text-sm text-neutral-600 dark:text-neutral-400">
              <li><Link href="/services/air-conditioner-installation">{t('ac_install')}</Link></li>
              <li><Link href="/services/air-conditioner-repair">{t('ac_repair')}</Link></li>
              <li><Link href="/services/air-conditioner-maintenance">{t('ac_maintenance')}</Link></li>
              <li><Link href="/services/refrigerators">{t('refrigerators')}</Link></li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold mb-3 text-sm uppercase tracking-wider text-neutral-500">
              {t('get_in_touch')}
            </h3>
            <ul className="space-y-3 text-sm text-neutral-600 dark:text-neutral-400">
              {settings.primaryPhone && (
                <li>
                  <span className="block text-xs uppercase tracking-wide text-neutral-400">
                    {t('contact_phone')}
                  </span>
                  <a href={settings.primaryPhone.url} className="hover:text-brand-600 transition-colors">
                    {settings.primaryPhone.display}
                  </a>
                </li>
              )}
              {settings.supportPhone && (
                <li>
                  <span className="block text-xs uppercase tracking-wide text-neutral-400">
                    {t('support_phone')}
                  </span>
                  <a href={settings.supportPhone.url} className="hover:text-brand-600 transition-colors">
                    {settings.supportPhone.display}
                  </a>
                </li>
              )}
              {settings.whatsappPhone && (
                <li>
                  <span className="block text-xs uppercase tracking-wide text-neutral-400">
                    {t('whatsapp')}
                  </span>
                  <a
                    href={settings.whatsappPhone.whatsapp}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-brand-600 transition-colors"
                  >
                    {settings.whatsappPhone.display}
                  </a>
                </li>
              )}
              {settings.contactEmail && (
                <li>
                  <span className="block text-xs uppercase tracking-wide text-neutral-400">
                    {t('email')}
                  </span>
                  <a
                    href={`mailto:${settings.contactEmail}`}
                    className="hover:text-brand-600 transition-colors break-all"
                  >
                    {settings.contactEmail}
                  </a>
                </li>
              )}
              {settings.address && (
                <li>
                  <span className="block text-xs uppercase tracking-wide text-neutral-400">
                    {t('address')}
                  </span>
                  <span>{settings.address}</span>
                </li>
              )}
              {settings.workingHours && (
                <li>
                  <span className="block text-xs uppercase tracking-wide text-neutral-400">
                    {t('working_hours')}
                  </span>
                  <span>{settings.workingHours}</span>
                </li>
              )}
              {(settings.facebookUrl || settings.instagramUrl) && (
                <li className="flex items-center gap-4 pt-1">
                  {settings.facebookUrl && (
                    <a
                      href={settings.facebookUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={t('facebook')}
                      className="hover:text-brand-600 transition-colors"
                    >
                      {t('facebook')}
                    </a>
                  )}
                  {settings.instagramUrl && (
                    <a
                      href={settings.instagramUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={t('instagram')}
                      className="hover:text-brand-600 transition-colors"
                    >
                      {t('instagram')}
                    </a>
                  )}
                </li>
              )}
            </ul>
          </div>
        </div>

        <div className="mt-8 pt-8 border-t text-center text-xs text-neutral-500">
          &copy; {new Date().getFullYear()} {settings.siteName}. {t('rights')}.
        </div>
      </div>
    </footer>
  );
}
