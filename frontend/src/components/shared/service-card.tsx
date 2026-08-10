import Image from 'next/image';
import { Link } from '@/i18n/navigation';
import { Service } from '@/types';
import { useLocale, useTranslations } from 'next-intl';
import { ArrowRight } from 'lucide-react';

const iconMap: Record<string, string> = {
  snowflake: '❄️',
  tool: '🔧',
  'refresh-cw': '🔄',
  wind: '💨',
  refrigerator: '🧊',
  'ice-cream': '🍦',
  shirt: '🫧',
  thermometer: '🚿',
  wrench: '🔧',
  zap: '⚡',
  camera: '🎥',
};

const serviceImageMap: Record<string, string> = {
  'washing-machines': '/images/services/washing-machine.png',
  'air-conditioner-installation': '/images/services/air-conditioner.png',
  'air-conditioner-maintenance': '/images/services/air-conditioner.png',
  'air-conditioner-repair': '/images/services/air-conditioner.png',
  refrigerators: '/images/services/refrigerator.png',
  freezers: '/images/services/freezer.png',
  'ventilation-systems': '/images/services/ventilation.png',
  'water-heaters': '/images/services/water-heater.png',

  // New services
  electrician: '/images/avatars/electrician.png',
  'cctv-surveillance': '/images/avatars/cctv-surveillance.png',
};
const DEFAULT_SERVICE_IMAGE = '/images/services/default.png';

interface Props {
  service: Service;
}

export function ServiceCard({ service }: Props) {
  const locale = useLocale();
  const t = useTranslations('services');
  const translation = service.translations.find((tr) => tr.locale === locale);

  if (!translation) return null;

  const imageSrc =
    service.image ?? serviceImageMap[service.slug] ?? DEFAULT_SERVICE_IMAGE;

  return (
    <Link
      href={`/services/${service.slug}`}
      className="group relative flex flex-col overflow-visible rounded-[28px]
border border-[#2b2b2b]
bg-[#111111]
min-h-[380px]
p-7
shadow-xl shadow-black/40
transition-all duration-300
ease-out
hover:-translate-y-1.5
hover:border-[#f59e0b]
hover:shadow-[0_0_0_1px_rgba(245,158,11,0.2),0_24px_50px_-20px_rgba(245,158,11,0.45)]
md:flex-row
md:items-center"  
    >
      {/* Avatar — 45% */}
      <div className="flex shrink-0 justify-center md:w-[40%] md:justify-start lg:w-[45%]">
       <div className="relative -mt-9 md:mt-0 md:-ms-9">

          {/* Orange Glow */}
          <div
              className="
                  absolute
                  inset-0
                  rounded-full
                  bg-orange-500/20
                  blur-3xl
                  scale-90
                  transition-all
                  duration-300
                  group-hover:scale-110
                  group-hover:bg-orange-400/30
              "
          />

          <Image
              src={imageSrc}
              alt={translation.name}
              width={340}
              height={340}
              className="
                  relative
                  z-10
                  h-auto
                  w-56
                  object-contain
                  transition-all
                  duration-300
                  group-hover:scale-110
                  sm:w-64
                  md:w-72
                  lg:w-80
              "
          />

      </div>
        </div>
      

      {/* Content — 55% */}
      <div className="mt-4 flex flex-1 flex-col items-start md:mt-0 md:w-[60%] lg:w-[55%]">
        <span className="mb-4 inline-flex items-center justify-center rounded-2xl border border-white/10 bg-white/5 p-3 text-2xl leading-none">
          {iconMap[service.icon] || '🔧'}
        </span>
        <h3 className="text-2xl font-bold leading-tight text-white md:text-[30px]">
          {translation.name}
        </h3>
        <p className="mt-2 line-clamp-3 text-sm text-gray-300 md:text-base">
          {translation.description}
        </p>

        <span className="mt-6 inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-orange-500 to-amber-500 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-orange-500/25 transition-shadow duration-300 hover:shadow-orange-500/40">
          {t('view_technicians')}
          <ArrowRight
            size={16}
            className="transition-transform duration-300 group-hover:translate-x-1 rtl:rotate-180 rtl:group-hover:-translate-x-1"
          />
        </span>
      </div>
    </Link>
  );
}

