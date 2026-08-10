import { setRequestLocale } from 'next-intl/server';
import { AdminDashboard } from '@/features/admin/admin-dashboard';

type Props = {
  params: Promise<{ locale: string }>;
};

export default async function AdminPanelPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <AdminDashboard />;
}
