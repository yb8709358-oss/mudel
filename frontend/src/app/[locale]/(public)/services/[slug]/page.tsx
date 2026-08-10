import { getTranslations, setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { Link } from '@/i18n/navigation';
import { getService, getServices, getTechnicians } from '@/lib/api';
import { TechnicianCard } from '@/components/shared/technician-card';
import { Service, ServiceTranslation, Technician } from '@/types';
import { Metadata } from 'next';
import Image from 'next/image';
import { isAllowedImageUrl, isGifUrl } from '@/lib/image-urls';

type Props = {
  params: Promise<{ locale: string; slug: string }>;
};

export async function generateStaticParams() {
  try {
    const res = await getServices();
    return res.data.flatMap((service) => 
  ['en', 'fr', 'ar'].map((locale) => ({ locale, slug: service.slug }))
);
  } catch {
    return [];
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, slug } = await params;

  try {
    const res = await getService(slug);
    const service = res.data;
    const translation = service.translations?.find((tr: ServiceTranslation) => tr.locale === locale);
    return {
      title: translation?.meta_title || translation?.name || service.slug,
      description: translation?.meta_desc || translation?.description,
      alternates: {
        languages: {
          en: `/en/services/${slug}`,
          fr: `/fr/services/${slug}`,
          ar: `/ar/services/${slug}`,
        },
      },
    };
  } catch {
    return { title: 'Service Not Found' };
  }
}

export default async function ServiceDetailPage({ params }: Props) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: 'services' });

  let service: Service | null = null;

  try {
    const svcRes = await getService(slug);
    service = svcRes.data;
  } catch {
    notFound();
  }

  if (!service) {
    notFound();
  }

  const translation = service.translations?.find((tr: ServiceTranslation) => tr.locale === locale);
  const serviceTitle = translation?.name || service.slug;
  // Only render URLs that pass the existing allow-list (same protection as the
  // admin editor): invalid or disallowed media is dropped, never rendered.
  const media = (service.media ?? []).filter((item) => isAllowedImageUrl(item.url));
  const avatarMap: Record<string, string> = {
  "washing-machines": "/images/avatars/washing-machine.png",

  "air-conditioner-installation": "/images/avatars/air-conditioner.png",
  "air-conditioner-maintenance": "/images/avatars/air-conditioner.png",
  "air-conditioner-repair": "/images/avatars/air-conditioner.png",

  "refrigerators": "/images/avatars/refrigerator.png",

  "freezers": "/images/avatars/freezer.png",

  "ventilation-systems": "/images/avatars/ventilation.png",

  "water-heaters": "/images/avatars/water-heater.png",

  "electrician": "/images/avatars/electrician.png",
  "cctv-surveillance": "/images/avatars/cctv-surveillance.png",
};

const avatar =
  avatarMap[service.slug] || "/images/avatars/default.png";
  let technicians: Technician[] = [];
  try {
    const techRes = await getTechnicians(slug);
    technicians = techRes.data;
  } catch {
    // Technicians fetch failure is non-fatal — show service without technicians
  }

  return (
    <div className="container-content section-padding">
      <div className="mb-4">
        <Link
          href="/services"
          className="text-sm text-brand-600 hover:text-brand-700 transition-colors"
        >
          <span aria-hidden="true" className="inline-block rtl:rotate-180">&larr;</span> {t('title')}
        </Link>
      </div>

    <div className="mb-12 grid lg:grid-cols-2 gap-10 items-center">

      {/* Left side */}
      <div>
        <h1 className="text-3xl md:text-4xl font-bold mb-4">
          {translation?.name || service.slug}
        </h1>

        {translation?.description && (
          <p className="text-lg text-neutral-600 dark:text-neutral-400 leading-8">
            {translation.description}
          </p>
        )}
      </div>

      {/* Right side */}
      <div className="flex justify-center">
        <img
          src={avatar}
          alt={serviceTitle}
          className="max-h-[420px] object-contain"
        />
      </div>

    </div>

      {media.length > 0 && (
        <div className="mb-12">
          <h2 className="text-xl font-semibold mb-4">{t('media')}</h2>
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
            {media.map((item, i) => (
              <div
                key={i}
                className="relative rounded-xl overflow-hidden bg-neutral-100 dark:bg-neutral-800 aspect-video"
              >
                {isGifUrl(item.url) ? (
                  // GIFs must keep animating: render with a plain <img> instead
                  // of the Next.js optimized image (which would collapse it to a
                  // static frame).
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={item.url}
                    alt={item.caption || serviceTitle}
                    className="absolute inset-0 w-full h-full object-cover"
                  />
                ) : (
                  <Image
                    src={item.url}
                    alt={item.caption || serviceTitle}
                    fill
                    className="object-cover"
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                  />
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {technicians.length > 0 && (
        <div>
          <h2 className="text-2xl font-bold mb-6">
            {t('technicians_title')}
          </h2>
          <div className="grid gap-6 md:grid-cols-2">
            {technicians.map((tech) => (
              <TechnicianCard key={tech.id} technician={tech} variant="detailed" />
            ))}
          </div>
        </div>
      )}

      {technicians.length === 0 && (
        <div className="p-8 rounded-xl border bg-neutral-50 dark:bg-neutral-900 text-center">
          <p className="text-neutral-500 dark:text-neutral-400 mb-4">
            {t('no_technicians')}
          </p>
          <Link
            href="/contact"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-brand-500 text-white font-semibold hover:bg-brand-600 transition-colors"
          >
            {t('contact_us')}
          </Link>
        </div>
      )}
    </div>
  );
}
      
