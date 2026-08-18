import { MetadataRoute } from 'next';
import { getServices, getTechnicians } from '@/lib/api';
import { SITE_URL } from '@/lib/env';

const locales = ['en', 'fr', 'ar'];
const baseUrl = SITE_URL;

const staticPages = ['', '/services', '/contact'];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const entries: MetadataRoute.Sitemap = [];

  for (const locale of locales) {
    for (const page of staticPages) {
      entries.push({
        url: `${baseUrl}/${locale}${page}`,
        lastModified: new Date(),
        changeFrequency: 'weekly',
        priority: page === '' ? 1.0 : 0.8,
      });
    }
  }

  // Service and technician detail pages are the actual long-tail SEO
  // targets for this site (e.g. "réparation climatiseur marrakech",
  // named technician profiles) — they were previously missing entirely,
  // so search engines had no way to discover them via the sitemap.
  try {
    const [servicesRes, techniciansRes] = await Promise.all([
      getServices(),
      getTechnicians(),
    ]);

    for (const service of servicesRes.data) {
      for (const locale of locales) {
        entries.push({
          url: `${baseUrl}/${locale}/services/${service.slug}`,
          lastModified: new Date(),
          changeFrequency: 'weekly',
          priority: 0.9,
        });
      }
    }

    for (const technician of techniciansRes.data) {
      for (const locale of locales) {
        entries.push({
          url: `${baseUrl}/${locale}/technicians/${technician.id}`,
          lastModified: new Date(),
          changeFrequency: 'monthly',
          priority: 0.7,
        });
      }
    }
  } catch {
    // If the API is unreachable at build time, still ship the static
    // pages rather than failing the whole sitemap.
  }

  return entries;
}
