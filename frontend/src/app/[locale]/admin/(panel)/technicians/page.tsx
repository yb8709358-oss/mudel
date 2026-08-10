import { setRequestLocale } from 'next-intl/server';
import { AdminTechnicians } from '@/features/admin/admin-technicians';

type Props = {
  params: Promise<{ locale: string }>;
};

export default async function AdminTechniciansPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <AdminTechnicians />;
}
