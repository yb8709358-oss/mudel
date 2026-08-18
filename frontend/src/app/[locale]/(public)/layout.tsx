import { ReactNode } from 'react';
import { Header } from '@/components/layout/header';
import { Footer } from '@/components/layout/footer';
import { FloatingCta } from '@/components/shared/floating-cta';
import { getPublicSiteSettings } from '@/lib/public-settings';

// Public pages always render at runtime against the live backend. Static
// generation at build time would bake empty data into the pages, because the
// Docker build cannot reach the backend (localhost:8000 is only resolvable on
// the host, and the build network has no `backend` service). Runtime rendering
// guarantees SSR always serves real services/technicians/settings, and admin
// edits appear immediately (getPublicSiteSettings / fetchAPI revalidate every
// request in this mode).
export const dynamic = 'force-dynamic';

export default async function PublicLayout({ children }: { children: ReactNode }) {
  const settings = await getPublicSiteSettings();

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1">{children}</main>
      <Footer settings={settings} />
      <FloatingCta />
    </div>
  );
}
