'use client';

import { useCallback, useEffect, useId, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { getServices, submitContact } from '@/lib/api';
import { Service } from '@/types';

const SUBMIT_ERROR_KEYS: Record<string, string> = {
  CONTACT_SERVICE_REQUIRED: 'error_service_required',
  SERVICE_NOT_FOUND: 'error_service_not_found',
  RATE_LIMIT_EXCEEDED: 'error_rate_limited',
};

function mapSubmitError(err: unknown, t: (key: string) => string): string {
  const code =
    err && typeof err === 'object' && 'code' in err && typeof (err as { code?: unknown }).code === 'string'
      ? (err as { code: string }).code
      : undefined;
  return code && SUBMIT_ERROR_KEYS[code] ? t(SUBMIT_ERROR_KEYS[code]) : t('error');
}

export function ContactForm() {
  const t = useTranslations('contact');
  const locale = useLocale();
  const baseId = useId();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [district, setDistrict] = useState('');
  const [message, setMessage] = useState('');
  const [serviceId, setServiceId] = useState('');
  const [services, setServices] = useState<Service[]>([]);
  const [servicesStatus, setServicesStatus] = useState<'loading' | 'loaded' | 'error'>('loading');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [requestToken, setRequestToken] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const errorId = `${baseId}-error`;
  const districts = [
  'Guéliz',
  'Hivernage',
  'Médina',
  'Sidi Ghanem',
  'Palmeraie',
  'Targa',
  'Massira',
  'Mhamid',
  'Daoudiate',
  'Hay Azli',
  'Hay Charaf',
  'Issil',
  'Semlalia',
  'sidi youssef ben ali',
  'Route de Casablanca',
  'Route de Safi',
  'Route d’Ourika',
  'Route de Fès',
  'Agdal',
  'Bab Doukkala',
  'Autre',
];
  const inputClass =
    'w-full px-4 py-2.5 rounded-lg border bg-white dark:bg-neutral-800 focus:outline-none focus:ring-2 focus:ring-brand-500 transition-shadow aria-[invalid=true]:border-red-500';
  const loadServices = useCallback(async () => {
    setServicesStatus('loading');
    try {
      const res = await getServices();
      setServices(res.data);
      setServicesStatus('loaded');
    } catch {
      setServicesStatus('error');
    }
  }, []);

  useEffect(() => {
    loadServices();
  }, [loadServices]);

  const serviceLabel = (service: Service) =>
    service.translations.find((tr) => tr.locale === locale)?.name || service.slug;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !phone.trim() || !serviceId) return;

    setStatus('loading');
    try {
      const res = await submitContact({
        name,
        phone,
        district,
        email: email || undefined,
        service_id: serviceId,
        message: message || undefined,
      });
      setRequestToken(res.data.request_token);
      setStatus('success');
      setName('');
      setPhone('');
      setDistrict('');
      setEmail('');
      setMessage('');
      setServiceId('');
    } catch (err) {
      setSubmitError(mapSubmitError(err, t));
      setStatus('error');
    }
  }

  if (status === 'success') {
    return (
      <div className="p-6 rounded-xl border border-green-200 bg-green-50 dark:bg-green-900/20 dark:border-green-800 text-center space-y-4">
        <p className="text-green-700 dark:text-green-300 font-medium">{t('success')}</p>
        {requestToken && (
          <>
            <p className="text-sm text-green-700/80 dark:text-green-300/80">{t('continue_request_hint')}</p>
            <Link
              href={`/request/${requestToken}`}
              className="inline-flex items-center justify-center w-full py-3 px-4 rounded-lg bg-brand-500 text-white font-medium hover:bg-brand-600 transition-colors"
            >
              {t('continue_request')}
            </Link>
          </>
        )}
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4" noValidate>
      <div>
        <label htmlFor={`${baseId}-service`} className="block text-sm font-medium mb-1">
          {t('service')}
        </label>
        {servicesStatus === 'loading' && (
          <select
            id={`${baseId}-service`}
            disabled
            aria-busy="true"
            className={inputClass}
          >
            <option>{t('services_loading')}</option>
          </select>
        )}
        {servicesStatus === 'error' && (
          <div className="flex flex-col gap-2">
            <p className="text-sm text-red-500">{t('services_error')}</p>
            <button
              type="button"
              onClick={loadServices}
              className="py-2 px-4 rounded-lg border border-brand-500 text-brand-600 dark:text-brand-400 font-medium hover:bg-brand-50 dark:hover:bg-brand-900/20 transition-colors"
            >
              {t('retry')}
            </button>
          </div>
        )}
        {servicesStatus === 'loaded' && (
          <select
            id={`${baseId}-service`}
            value={serviceId}
            onChange={(e) => setServiceId(e.target.value)}
            required
            className={inputClass}
          >
            <option value="">{t('choose_service')}</option>
            {services.map((service) => (
              <option key={service.id} value={service.id}>
                {serviceLabel(service)}
              </option>
            ))}
          </select>
        )}
      </div>

      <div>
        <label htmlFor={`${baseId}-name`} className="block text-sm font-medium mb-1">{t('name')}</label>
        <input
          id={`${baseId}-name`}
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          autoComplete="name"
          className={inputClass}
          placeholder={t('name')}
        />
      </div>

      <div>
        <label htmlFor={`${baseId}-phone`} className="block text-sm font-medium mb-1">{t('phone')}</label>
        <input
          id={`${baseId}-phone`}
          type="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          required
          autoComplete="tel"
          className={inputClass}
          placeholder="+212 X XX XX XX XX"
        />
      </div>
       <div>
  <label htmlFor={`${baseId}-district`} className="block text-sm font-medium mb-1">
    {t('district')}
  </label>

  <select
    id={`${baseId}-district`}
    value={district}
    onChange={(e) => setDistrict(e.target.value)}
    required
    className={inputClass}
  >
    <option value="">
      {t('choose_district')}
    </option>

    {districts.map((item) => (
      <option key={item} value={item}>
        {item}
      </option>
    ))}
  </select>
</div>
      <div>
        <label htmlFor={`${baseId}-email`} className="block text-sm font-medium mb-1">{t('email')}</label>
        <input
          id={`${baseId}-email`}
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
          className={inputClass}
        />
      </div>

      <div>
        <label htmlFor={`${baseId}-message`} className="block text-sm font-medium mb-1">{t('message')}</label>
        <textarea
          id={`${baseId}-message`}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={4}
          className={`${inputClass} resize-none`}
        />
      </div>

      <div aria-live="polite">
        {status === 'error' && (
          <p id={errorId} className="text-red-500 text-sm">{submitError ?? t('error')}</p>
        )}
      </div>

      <button
        type="submit"
        disabled={status === 'loading'}
        className="w-full py-3 px-4 rounded-lg bg-brand-500 text-white font-medium hover:bg-brand-600 disabled:opacity-50 transition-colors"
      >
        {status === 'loading' ? '...' : t('submit')}
      </button>
    </form>
  );
}
