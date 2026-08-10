const ALLOWED_IMAGE_HOSTS = new Set(['images.unsplash.com']);
const ALLOWED_IMAGE_HOST_SUFFIXES = ['.supabase.co'];

export function isAllowedImageUrl(url: string | null | undefined): boolean {
  if (!url) return false;
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== 'https:') return false;
    if (parsed.username || parsed.password) return false;
    const hostname = parsed.hostname.toLowerCase();
    if (ALLOWED_IMAGE_HOSTS.has(hostname)) return true;
    return ALLOWED_IMAGE_HOST_SUFFIXES.some((suffix) => hostname.endsWith(suffix));
  } catch {
    return false;
  }
}

/**
 * True when the URL points at a `.gif` file. Animated GIFs must be rendered
 * with a plain `<img>` element so the animation is preserved instead of being
 * converted into a static optimized image by the Next.js image optimizer.
 */
export function isGifUrl(url: string | null | undefined): boolean {
  if (!url) return false;
  try {
    return new URL(url).pathname.toLowerCase().endsWith('.gif');
  } catch {
    return false;
  }
}
