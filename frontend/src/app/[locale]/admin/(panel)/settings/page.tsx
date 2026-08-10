import { setRequestLocale } from 'next-intl/server';
import { AdminSettings } from '@/features/admin/admin-settings';

type Props = {
  params: Promise<{ locale: string }>;
};

export default async function AdminSettingsPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <AdminSettings />;
}
