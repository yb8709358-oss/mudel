import { setRequestLocale } from 'next-intl/server';
import { AdminServices } from '@/features/admin/admin-services';

type Props = {
  params: Promise<{ locale: string }>;
};

export default async function AdminServicesPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <AdminServices />;
}
