import { getTranslations, setRequestLocale } from 'next-intl/server';
import { ContactForm } from '@/features/contact/contact-form';
import { getPublicSiteSettings } from '@/lib/public-settings';
import Image from 'next/image';

type Props = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'contact' });

  return {
    title: t('title'),
    description: t('subtitle'),
  };
}

export default async function ContactPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations({
    locale,
    namespace: 'contact',
  });

  const settings = await getPublicSiteSettings();
  const { primaryPhone, supportPhone, whatsappPhone, contactEmail } = settings;

  return (
    <section className="relative overflow-hidden">

      <Image
        src="/images/contact/contact-bg.png"
        alt="Contact Background"
        fill
        priority
        className="object-cover"
      />

      {/* Overlay */}
      <div className="absolute inset-0 bg-white/10"></div>

      <div className="relative z-10 container-content section-padding">
        <div className="text-center mb-12">
          <h1 className="text-3xl md:text-4xl font-bold mb-2">
            {t('title')}
          </h1>
          <p className="text-neutral-500 dark:text-neutral-400">
            {t('subtitle')}
          </p>
        </div>

        <div className="grid gap-8 md:grid-cols-2 max-w-5xl mx-auto">

          {/* Contact Form */}
          <div>
            <h2 className="text-xl font-semibold mb-6">
              {t('form_title')}
            </h2>

            <ContactForm />
          </div>

          {/* Contact Card */}
          <div className="p-8 rounded-2xl border border-neutral-200 dark:border-neutral-700 bg-white/90 dark:bg-neutral-900/80 backdrop-blur-md shadow-xl transition-all duration-300">

            {/* Avatar */}
            <div className="flex justify-center mb-6">
              <Image
                src="/images/contact/support-agent.png"
                alt="Mudel Support"
                width={280}
                height={280}
                priority
                className="object-contain"
              />
            </div>

            <h2 className="text-2xl font-bold text-center mb-6">
              {t('or_call')}
            </h2>

            <div className="space-y-4">

              {primaryPhone && (
                <a
                  href={primaryPhone.url}
                  className="flex items-center justify-center gap-2 w-full py-3 px-4 rounded-xl bg-brand-500 text-white font-semibold hover:bg-brand-600 transition-colors"
                >
                  📞 {t('call_now')}
                </a>
              )}

              {whatsappPhone && (
                <a
                  href={whatsappPhone.whatsapp}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 w-full py-3 px-4 rounded-xl bg-green-500 text-white font-semibold hover:bg-green-600 transition-colors"
                >
                  💬 {t('whatsapp')}
                </a>
              )}

            </div>

            <div className="mt-8 pt-6 border-t border-orange-200 space-y-3">

              <div>
                <p className="text-sm text-neutral-600 dark:text-neutral-300">
                  <strong>📞 {t('phone_primary')}:</strong>{" "}
                  {primaryPhone && (
                    <a
                      href={primaryPhone.url}
                      className="hover:text-brand-500 transition-colors"
                    >
                      {primaryPhone.display}
                    </a>
                  )}
                </p>

                <p className="text-sm text-neutral-600 dark:text-neutral-300 mt-1">
                  <strong>📞 {t('phone_secondary')}:</strong>{" "}
                  {supportPhone && (
                    <a
                      href={supportPhone.url}
                      className="hover:text-brand-500 transition-colors"
                    >
                      {supportPhone.display}
                    </a>
                  )}
                </p>
              </div>

              <p className="text-sm text-neutral-600 dark:text-neutral-300">
                <strong>✉️ {t('email_label')}:</strong>{" "}
                {contactEmail && (
                  <a
                    href={`mailto:${contactEmail}`}
                    className="hover:text-brand-500 transition-colors break-all"
                  >
                    {contactEmail}
                  </a>
                )}
              </p>

            </div>

          </div>

        </div>
      </div>

    </section>
  );
}
