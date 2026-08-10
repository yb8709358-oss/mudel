import { getTranslations, setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { getTechnician } from '@/lib/api';
import { StarRating } from '@/components/shared/star-rating';
import { Phone, MessageCircle, Globe, MapPin, Clock, Briefcase } from 'lucide-react';
import Image from 'next/image';
import { Metadata } from 'next';
import { Technician, TechnicianTranslation } from '@/types';
import { getCallUrl, getWhatsappUrl } from '@/lib/utils';
import { isAllowedImageUrl } from '@/lib/image-urls';

type Props = {
  params: Promise<{ locale: string; id: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, id } = await params;

  try {
    const res = await getTechnician(id);
    const tech = res.data;
    return {
      title: `${tech.name} | Technician Marrakech`,
      description:
        tech.translations?.find((tr: TechnicianTranslation) => tr.locale === locale)?.bio || tech.name,
    };
  } catch {
    return { title: 'Technician Not Found' };
  }
}

export default async function TechnicianDetailPage({ params }: Props) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: 'technicians' });

  let tech: Technician | null = null;

  try {
    const res = await getTechnician(id);
    tech = res.data;
  } catch {
    notFound();
  }

  if (!tech) {
    notFound();
  }

  const translation = tech.translations?.find((tr: TechnicianTranslation) => tr.locale === locale);
  // working_hours/languages now come back as real JSON objects/arrays from the
  // API (fixed backend schema) — no more manual JSON.parse() on a string that
  // could be malformed and crash this server-rendered page.
  const workingHours = tech.working_hours;
  const languages = tech.languages ?? [];
  const photoUrl = isAllowedImageUrl(tech.photo_url) ? tech.photo_url : undefined;
  const visibleMedia = tech.media.filter((photo) => isAllowedImageUrl(photo.url));

  return (
    <div className="container-content section-padding">
      <div className="grid gap-8 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <div className="flex flex-col sm:flex-row gap-6 mb-8">
            <div className="relative w-24 h-24 sm:w-32 sm:h-32 rounded-2xl bg-neutral-100 dark:bg-neutral-700 overflow-hidden flex-shrink-0">
              {photoUrl ? (
                <Image
                  src={photoUrl}
                  alt={tech.name}
                  fill
                  className="object-cover"
                  sizes="(max-width: 640px) 96px, 128px"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-3xl text-neutral-400">
                  {tech.name[0]}
                </div>
              )}
            </div>
            <div>
              <h1 className="text-3xl font-bold mb-2">{tech.name}</h1>
              <StarRating rating={tech.rating} size={18} className="mb-2" />
              <p className="text-sm text-neutral-500 dark:text-neutral-400">
                {t('rating_summary', { rating: tech.rating, count: tech.review_count })}
                {tech.years_exp ? ` · ${t('years_exp', { years: tech.years_exp })}` : ''}
              </p>
            </div>
          </div>

          {translation?.bio && (
            <p className="text-neutral-600 dark:text-neutral-400 mb-8 leading-relaxed">
              {translation.bio}
            </p>
          )}

          {visibleMedia.length > 0 && (
            <div className="mb-8">
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <Briefcase size={20} /> {t('photos')}
              </h2>
              <div className="grid gap-4 grid-cols-2 sm:grid-cols-3">
                {visibleMedia.map((photo, i) => (
                  <div
                    key={i}
                    className="relative rounded-xl overflow-hidden bg-neutral-100 dark:bg-neutral-800 aspect-video"
                  >
                    <Image
                      src={photo.url}
                      alt={photo.caption || ''}
                      fill
                      className="object-cover"
                      sizes="(max-width: 640px) 50vw, 33vw"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="space-y-6">
          <div className="p-6 rounded-xl border bg-white dark:bg-neutral-800">
            <h2 className="font-semibold mb-4">{t('contact')}</h2>
            <div className="space-y-3">
              <a
                href={getCallUrl(tech.phone)}
                className="flex items-center justify-center gap-2 w-full py-3 px-4 rounded-lg bg-brand-500 text-white font-medium hover:bg-brand-600 transition-colors"
              >
                <Phone size={18} /> {t('call')}
              </a>
              {tech.whatsapp && (
                <a
                  href={getWhatsappUrl(tech.whatsapp)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 w-full py-3 px-4 rounded-lg bg-green-500 text-white font-medium hover:bg-green-600 transition-colors"
                >
                  <MessageCircle size={18} /> {t('whatsapp')}
                </a>
              )}
            </div>
          </div>

          <div className="p-6 rounded-xl border bg-white dark:bg-neutral-800">
            <h2 className="font-semibold mb-4">{t('information')}</h2>
            <div className="space-y-3 text-sm">
              {tech.service_area && (
                <div className="flex items-start gap-3">
                  <MapPin size={16} className="mt-0.5 text-neutral-400" />
                  <div>
                    <p className="text-neutral-500 text-xs">{t('service_area')}</p>
                    <p>{tech.service_area}</p>
                  </div>
                </div>
              )}

              {workingHours && (
                <div className="flex items-start gap-3">
                  <Clock size={16} className="mt-0.5 text-neutral-400" />
                  <div>
                    <p className="text-neutral-500 text-xs">{t('working_hours')}</p>
                    <div className="space-y-0.5">
                      {Object.entries(workingHours).map(([day, hours]) => (
                        <div key={day} className="flex gap-4">
                          <span className="w-12 text-neutral-400 text-xs">{t.has(`day_${day}`) ? t(`day_${day}`) : day}</span>
                          <span>{hours}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {languages.length > 0 && (
                <div className="flex items-start gap-3">
                  <Globe size={16} className="mt-0.5 text-neutral-400" />
                  <div>
                    <p className="text-neutral-500 text-xs">{t('languages')}</p>
                    <div className="flex flex-wrap gap-1.5 mt-1">
                      {languages.map((lang) => (
                        <span
                          key={lang}
                          className="px-2.5 py-0.5 rounded-full bg-brand-50 text-brand-700 dark:bg-brand-900/30 dark:text-brand-300 text-xs font-medium"
                        >
                          {lang}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
