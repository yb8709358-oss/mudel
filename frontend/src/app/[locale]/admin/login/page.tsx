import { getTranslations, setRequestLocale } from 'next-intl/server';
import { AdminLoginForm } from '@/features/admin/admin-login-form';

type Props = {
  params: Promise<{ locale: string }>;
};

export default async function AdminLoginPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: 'admin' });

  return (
    <div className="container-content section-padding">
      <h1 className="text-2xl font-bold text-center mb-8">{t('login_title')}</h1>
      <AdminLoginForm />
    </div>
  );
}
