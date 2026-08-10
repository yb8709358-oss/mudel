'use client';

import { ImageIcon } from 'lucide-react';

export function AdminAttachmentGallery({ attachments, label }: { attachments?: string[] | null; label: string }) {
  const urls = (attachments ?? []).filter((url): url is string => typeof url === 'string' && url.length > 0);
  if (urls.length === 0) return null;

  return (
    <div>
      <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-neutral-500">
        <ImageIcon size={14} />
        {label}
      </p>
      <div className="mt-2 grid grid-cols-3 gap-2">
        {urls.map((url, i) => (
          <a
            key={`${url}-${i}`}
            href={url}
            target="_blank"
            rel="noreferrer"
            aria-label={`${label} ${i + 1}`}
            className="group relative block aspect-square overflow-hidden rounded-xl border border-neutral-200/80 bg-neutral-100 dark:border-neutral-800/80 dark:bg-neutral-900"
          >
            <img
              src={url}
              alt={`${label} ${i + 1}`}
              loading="lazy"
              className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-105"
            />
          </a>
        ))}
      </div>
    </div>
  );
}
