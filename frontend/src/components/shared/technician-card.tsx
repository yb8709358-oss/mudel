import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { Technician } from '@/types';
import { StarRating } from './star-rating';
import { Phone, MessageCircle } from 'lucide-react';
import Image from 'next/image';
import { getCallUrl, getWhatsappUrl } from '@/lib/utils';
import { isAllowedImageUrl } from '@/lib/image-urls';

interface Props {
  technician: Technician;
  variant?: 'compact' | 'detailed';
}

export function TechnicianCard({ technician, variant = 'compact' }: Props) {
  const t = useTranslations('technicians');
  const photoUrl = isAllowedImageUrl(technician.photo_url) ? technician.photo_url : undefined;

  return (
    <div className="rounded-xl border bg-white dark:bg-neutral-800 overflow-hidden transition-all duration-200 hover:shadow-elevated">
      <div className="p-6">
        <div className="flex items-center gap-4 mb-4">
          <div className="relative w-14 h-14 rounded-full bg-neutral-100 dark:bg-neutral-700 overflow-hidden flex-shrink-0">
            {photoUrl ? (
              <Image
                src={photoUrl}
                alt={technician.name}
                fill
                className="object-cover"
                sizes="56px"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-xl text-neutral-400">
                {technician.name[0]}
              </div>
            )}
          </div>
          <div>
            <h3 className="font-semibold">{technician.name}</h3>
            <div className="flex items-center gap-2 mt-0.5">
              <StarRating rating={technician.rating} size={14} />
              <span className="text-xs text-neutral-500">
                {t('rating_summary', { rating: technician.rating, count: technician.review_count })}
              </span>
            </div>
          </div>
        </div>

        {technician.years_exp && (
          <p className="text-sm text-neutral-500 dark:text-neutral-400 mb-3">
            {t('years_exp', { years: technician.years_exp })}
          </p>
        )}

        {technician.service_area && (
          <p className="text-sm text-neutral-500 dark:text-neutral-400 mb-4">
            📍 {technician.service_area}
          </p>
        )}

        <div className="flex gap-2">
          <a
            href={getCallUrl(technician.phone)}
            className="flex items-center justify-center gap-2 flex-1 py-2.5 px-4 rounded-lg bg-brand-500 text-white text-sm font-medium hover:bg-brand-600 transition-colors"
          >
            <Phone size={16} />
            {t('call')}
          </a>
          {technician.whatsapp && (
            <a
              href={getWhatsappUrl(technician.whatsapp)}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 flex-1 py-2.5 px-4 rounded-lg bg-green-500 text-white text-sm font-medium hover:bg-green-600 transition-colors"
            >
              <MessageCircle size={16} />
              {t('whatsapp')}
            </a>
          )}
        </div>
      </div>

      {variant === 'detailed' && (
        <Link
          href={`/technicians/${technician.id}`}
          className="block p-6 border-t bg-neutral-50 dark:bg-neutral-900 hover:bg-brand-50 dark:hover:bg-brand-900/20 transition-colors"
        >
          <p className="text-sm text-neutral-600 dark:text-neutral-400">
            {t('view_profile')}{' '}
            <span aria-hidden="true" className="inline-block rtl:rotate-180">→</span>
          </p>
        </Link>
      )}
    </div>
  );
}
