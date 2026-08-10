import { getTranslations, setRequestLocale } from 'next-intl/server';
import { RequestForm } from '@/features/request/request-form';

type Props = {
  params: Promise<{ locale: string; token: string }>;
};

export async function generateMetadata({ params }: Props) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'request' });

  return {
    title: t('title'),
    description: t('title'),
  };
}

export default async function RequestPage({ params }: Props) {
  const { locale, token } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: 'request' });

  return (
    <section className="container-content section-padding">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-3xl md:text-4xl font-bold text-center mb-2">{t('title')}</h1>
        <RequestForm token={token} />
      </div>
    </section>
  );
}
