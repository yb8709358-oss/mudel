'use client';

import { Star } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Props {
  rating: number;
  max?: number;
  size?: number;
  className?: string;
}

export function StarRating({ rating, max = 5, size = 16, className }: Props) {
  return (
    <div className={cn('flex items-center gap-0.5', className)}>
      {Array.from({ length: max }, (_, i) => (
        <Star
          key={i}
          size={size}
          className={cn(
            i < rating
              ? 'fill-accent-500 text-accent-500'
              : 'fill-neutral-200 text-neutral-200 dark:fill-neutral-700 dark:text-neutral-700',
          )}
        />
      ))}
    </div>
  );
}
