import { setRequestLocale } from 'next-intl/server';
import { AdminDistricts } from '@/features/admin/admin-districts';

type Props = {
  params: Promise<{ locale: string }>;
};

export default async function AdminDistrictsPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <AdminDistricts />;
}
