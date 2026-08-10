import { ReactNode } from 'react';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { AdminShell } from '@/features/admin/admin-shell';
import { AdminToastProvider } from '@/features/admin/components/admin-toast';
import { adminSessionCookieName, isValidAdminSession } from '@/lib/admin-auth';

type Props = {
  children: ReactNode;
  params: Promise<{ locale: string }>;
};

export default async function AdminPanelLayout({ children, params }: Props) {
  const { locale } = await params;
  const cookieStore = await cookies();
  const session = cookieStore.get(adminSessionCookieName)?.value;

  if (!isValidAdminSession(session)) {
    redirect(`/${locale}/admin/login`);
  }

  return (
    <AdminShell>
      <AdminToastProvider>{children}</AdminToastProvider>
    </AdminShell>
  );
}
