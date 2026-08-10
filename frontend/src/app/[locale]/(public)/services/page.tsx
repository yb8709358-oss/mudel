import { getTranslations, setRequestLocale } from 'next-intl/server';
import { ServiceCard } from '@/components/shared/service-card';
import { getServices } from '@/lib/api';
import { Service } from '@/types';

type Props = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'services' });
  return {
    title: t('title'),
    description: t('subtitle'),
  };
}

export default async function ServicesPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: 'services' });

  let services: Service[] = [];
  try {
    const res = await getServices();
    services = res.data;
  } catch {}

  return (
    <section className="relative min-h-screen w-full">
      <div className="pointer-events-none fixed inset-0 -z-10" aria-hidden="true">
        <div
          className="absolute inset-0 bg-contain bg-center bg-no-repeat bg-[hsl(var(--background))]"
          style={{ backgroundImage: "url('/images/hero/my_team.png')" }}
        ></div>
        <div className="absolute inset-0 bg-white/30 dark:bg-black/65"></div>
      </div>
      <div className="relative z-10 container-content section-padding">
        <div className="text-center mb-12">
          <h1 className="text-3xl md:text-4xl font-bold mb-2">{t('title')}</h1>
          <p className="text-neutral-500 dark:text-neutral-400">{t('subtitle')}</p>
        </div>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-4">
          {services.map((service) => (
            <ServiceCard key={service.id} service={service} />
          ))}
        </div>
      </div>
    </section>
  );
}
