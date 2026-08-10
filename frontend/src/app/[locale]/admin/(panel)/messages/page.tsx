import { setRequestLocale } from 'next-intl/server';
import { AdminMessages } from '@/features/admin/admin-messages';

type Props = {
  params: Promise<{ locale: string }>;
};

export default async function AdminMessagesPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <AdminMessages />;
}
