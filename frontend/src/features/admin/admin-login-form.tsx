'use client';

import { useState } from 'react';
import { useRouter } from '@/i18n/navigation';
import { useTranslations } from 'next-intl';
import { AdminButton, AdminInput, AdminLabel } from '@/features/admin/components/admin-ui';

export function AdminLoginForm() {
  const t = useTranslations('admin');
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.message || t('login_error'));
        setLoading(false);
        return;
      }

      router.replace('../admin');
      router.refresh();
    } catch {
      setError(t('login_error'));
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mx-auto max-w-sm space-y-4">
      <div className="space-y-2">
        <AdminLabel htmlFor="admin-password">{t('password')}</AdminLabel>
        <AdminInput
          id="admin-password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          autoFocus
        />
      </div>
      {error && <p className="text-sm text-red-500">{error}</p>}
      <AdminButton type="submit" disabled={loading} className="w-full">
        {loading ? t('loading') : t('login_submit')}
      </AdminButton>
    </form>
  );
}
