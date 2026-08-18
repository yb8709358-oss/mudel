import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { ServiceCard } from '@/components/shared/service-card';
import { TechnicianCard } from '@/components/shared/technician-card';
import { getServices, getTechnicians } from '@/lib/api';
import { Service, Technician } from '@/types';
import Image from "next/image";
type Props = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'home' });

  return {
    title: t('hero_title'),
    description: t('hero_subtitle'),
  };
}

export default async function HomePage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: 'home' });

  let services: Service[] = [];
  let technicians: Technician[] = [];

  try {
    const servicesRes = await getServices();
    services = servicesRes.data;
    const techRes = await getTechnicians();
    technicians = techRes.data;
  } catch {
    // Fallback: show nothing if API is unavailable
  }

  return (
    <>
      <section className="relative overflow-hidden min-h-[650px] flex items-center">

  <Image
    src="/images/hero/hero-marrakech.png"
    alt="Marrakech"
    fill
    priority
    className="object-cover"
  />

  {/* Dark overlay */}
  <div className="absolute inset-0 bg-black/60"></div>

  <div className="relative z-10 container-content section-padding">
    <div className="max-w-2xl">

      <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight mb-6 text-white">
        {t("hero_title")}
      </h1>

      <p className="text-lg md:text-xl text-neutral-200 mb-8 max-w-xl">
        {t("hero_subtitle")}
      </p>

      <Link
        href="/services"
        className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-brand-500 text-white font-semibold hover:bg-brand-600 transition-colors text-lg"
      >
        {t("hero_cta")}
      </Link>

    </div>
  </div>

</section>

      {services.length > 0 && (
        <section className="container-content section-padding">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-2">{t('services_title')}</h2>
            <p className="text-neutral-500 dark:text-neutral-400">{t('services_subtitle')}</p>
          </div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-2">
            {services.map((service) => (
              <ServiceCard key={service.id} service={service} />
            ))}
          </div>
        </section>
      )}

      {technicians.length > 0 && (
        <section className="bg-neutral-50 dark:bg-neutral-900 section-padding">
          <div className="container-content">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold mb-2">{t('technicians_title')}</h2>
              <p className="text-neutral-500 dark:text-neutral-400">{t('technicians_subtitle')}</p>
            </div>
            <div className="grid gap-6 md:grid-cols-3">
              {technicians.map((tech) => (
                <TechnicianCard key={tech.id} technician={tech} />
              ))}
            </div>
          </div>
        </section>
      )}

      <section className="container-content section-padding">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold mb-2">{t('why_title')}</h2>
        </div>
        <div className="grid gap-8 md:grid-cols-3">
          <div className="text-center p-6">
            <div className="text-4xl mb-4">✅</div>
            <h3 className="font-semibold mb-2">{t('why_reliable')}</h3>
            <p className="text-sm text-neutral-500 dark:text-neutral-400">{t('why_reliable_desc')}</p>
          </div>
          <div className="text-center p-6">
            <div className="text-4xl mb-4">⚡</div>
            <h3 className="font-semibold mb-2">{t('why_fast')}</h3>
            <p className="text-sm text-neutral-500 dark:text-neutral-400">{t('why_fast_desc')}</p>
          </div>
          <div className="text-center p-6">
            <div className="text-4xl mb-4">📍</div>
            <h3 className="font-semibold mb-2">{t('why_local')}</h3>
            <p className="text-sm text-neutral-500 dark:text-neutral-400">{t('why_local_desc')}</p>
          </div>
        </div>
      </section>
    </>
  );
}
