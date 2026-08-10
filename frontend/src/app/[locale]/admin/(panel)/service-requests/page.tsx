import { setRequestLocale } from 'next-intl/server';
import { AdminServiceRequests } from '@/features/admin/admin-service-requests';

type Props = {
  params: Promise<{ locale: string }>;
};

export default async function AdminServiceRequestsPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <AdminServiceRequests />;
}
