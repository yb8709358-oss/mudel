import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatPhone(phone: string): string {
  return phone.replace(/[^+\d]/g, '');
}

export function getWhatsappUrl(phone: string, message?: string): string {
  const encoded = message ? `?text=${encodeURIComponent(message)}` : '';
  return `https://wa.me/${formatPhone(phone)}${encoded}`;
}

export function getCallUrl(phone: string): string {
  return `tel:${formatPhone(phone)}`;
}
