'use client';

import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { ApiError, getDistricts, getRequestAccess, submitRequest, uploadRequestImages } from '@/lib/api';
import {
  errorCodeToKey,
  isLatitudeValid,
  isLongitudeValid,
  MAX_REQUEST_IMAGES,
  validateImageFiles,
} from '@/lib/request-validation';
import { District, RequestAccessData, RequestContactSummary } from '@/types';

type Phase =
  | 'checking'
  | 'check_error'
  | 'invalid'
  | 'expired'
  | 'consumed'
  | 'form'
  | 'submitting'
  | 'success';

interface PendingImage {
  file: File;
  preview: string;
}

export function RequestForm({ token }: { token: string }) {
  const t = useTranslations('request');
  const locale = useLocale();
  const baseId = useId();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imagesRef = useRef<PendingImage[]>([]);

  const [phase, setPhase] = useState<Phase>('checking');
  const [contact, setContact] = useState<RequestContactSummary | null>(null);
  const [requestNumber, setRequestNumber] = useState<string | null>(null);
  const [errorKey, setErrorKey] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const [districts, setDistricts] = useState<District[]>([]);
  const [districtsLoaded, setDistrictsLoaded] = useState(false);
  const [districtId, setDistrictId] = useState('');
  const [address, setAddress] = useState('');
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');
  const [description, setDescription] = useState('');
  const [preferredDate, setPreferredDate] = useState('');
  const [preferredTime, setPreferredTime] = useState('');
  const [images, setImages] = useState<PendingImage[]>([]);
  const [geoStatus, setGeoStatus] = useState<'idle' | 'locating' | 'success' | 'denied' | 'unavailable'>('idle');

  const inputClass =
    'w-full px-4 py-2.5 rounded-lg border bg-white dark:bg-neutral-800 focus:outline-none focus:ring-2 focus:ring-brand-500 transition-shadow aria-[invalid=true]:border-red-500';
  const today = new Date().toISOString().split('T')[0];

  const checkAccess = useCallback(async () => {
    setPhase('checking');
    try {
      const res = await getRequestAccess(token);
      const data: RequestAccessData = res.data;
      if (data.status === 'available') {
        setContact(data.contact);
        setPhase('form');
      } else if (data.status === 'expired') {
        setPhase('expired');
      } else {
        setRequestNumber(data.request_number);
        setPhase('consumed');
      }
    } catch (err) {
      if (err instanceof ApiError && err.code === 'REQUEST_NOT_FOUND') {
        setPhase('invalid');
      } else {
        setPhase('check_error');
      }
    }
  }, [token]);

  useEffect(() => {
    checkAccess();
  }, [checkAccess]);

  useEffect(() => {
    if (phase !== 'form' || districtsLoaded) return;
    setDistrictsLoaded(true);
    getDistricts()
      .then((res) => setDistricts(res.data))
      .catch(() => setDistricts([]));
  }, [phase, districtsLoaded]);

  useEffect(() => {
    imagesRef.current = images;
  }, [images]);

  useEffect(() => {
    return () => {
      imagesRef.current.forEach((img) => URL.revokeObjectURL(img.preview));
    };
  }, []);

  function handleFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = Array.from(e.target.files ?? []);
    e.target.value = '';
    setErrorKey(null);

    if (selected.length + images.length > MAX_REQUEST_IMAGES) {
      setErrorKey('max_images');
      return;
    }

    const result = validateImageFiles(selected);
    if (!result.ok) {
      setErrorKey(result.errorKey);
      return;
    }

    const next: PendingImage[] = result.files.map((file) => ({
      file,
      preview: URL.createObjectURL(file),
    }));

    setImages((prev) => [...prev, ...next]);
  }

  function removeImage(index: number) {
    setImages((prev) => {
      const removed = prev[index];
      if (removed) URL.revokeObjectURL(removed.preview);
      return prev.filter((_, i) => i !== index);
    });
    setErrorKey(null);
  }

  function handleUseLocation() {
    if (!('geolocation' in navigator)) {
      setGeoStatus('unavailable');
      return;
    }
    setGeoStatus('locating');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLatitude(pos.coords.latitude.toFixed(6));
        setLongitude(pos.coords.longitude.toFixed(6));
        setGeoStatus('success');
      },
      (err) => {
        setGeoStatus(err.code === err.PERMISSION_DENIED ? 'denied' : 'unavailable');
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 },
    );
  }

  function errorMessageFromCode(err: unknown): string | null {
    if (err instanceof ApiError) {
      if (err.code === 'TOKEN_EXPIRED') {
        setPhase('expired');
        return null;
      }
      if (err.code === 'TOKEN_CONSUMED') {
        setPhase('consumed');
        return null;
      }
      return errorCodeToKey(err.code) ?? 'generic_error';
    }
    return 'generic_error';
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrorKey(null);

    if (!address.trim()) {
      setErrorKey('address_error');
      return;
    }
    if (!description.trim()) {
      setErrorKey('description_error');
      return;
    }
    if (!preferredDate) {
      setErrorKey('preferred_date_error');
      return;
    }
    if (!preferredTime) {
      setErrorKey('preferred_time_error');
      return;
    }

    let lat: number | null = null;
    let lng: number | null = null;
    if (latitude.trim() !== '' || longitude.trim() !== '') {
      lat = latitude.trim() === '' ? null : Number(latitude);
      lng = longitude.trim() === '' ? null : Number(longitude);
      if (
        (lat !== null && !isLatitudeValid(lat)) ||
        (lng !== null && !isLongitudeValid(lng))
      ) {
        setErrorKey('location_invalid');
        return;
      }
    }

    setPhase('submitting');
    try {
      let attachments: string[] | undefined;
      if (images.length > 0) {
        setUploading(true);
        const upload = await uploadRequestImages(token, images.map((img) => img.file));
        attachments = upload.data.urls;
        setUploading(false);
      }

      const res = await submitRequest(token, {
        address: address.trim(),
        latitude: lat,
        longitude: lng,
        district_id: districtId || null,
        description: description.trim(),
        preferred_date: preferredDate,
        preferred_time: preferredTime.trim(),
        attachments,
      });

      setRequestNumber(res.data.request_number);
      setPhase('success');
    } catch (err) {
      setUploading(false);
      const mapped = errorMessageFromCode(err);
      if (mapped) setErrorKey(mapped);
      setPhase('form');
    }
  }

  if (phase === 'checking') {
    return (
      <div className="mt-8 p-6 rounded-xl border border-neutral-200 dark:border-neutral-700 text-center">
        <p className="text-neutral-500 dark:text-neutral-400">{t('loading')}</p>
      </div>
    );
  }

  if (phase === 'check_error') {
    return (
      <div className="mt-8 p-6 rounded-xl border border-red-200 bg-red-50 dark:bg-red-900/20 dark:border-red-800 text-center">
        <p className="text-red-700 dark:text-red-300 font-medium mb-4">{t('generic_error')}</p>
        <button
          type="button"
          onClick={checkAccess}
          className="py-2.5 px-4 rounded-lg bg-brand-500 text-white font-medium hover:bg-brand-600 transition-colors"
        >
          {t('retry')}
        </button>
      </div>
    );
  }

  if (phase === 'invalid' || phase === 'expired') {
    return (
      <div className="mt-8 p-6 rounded-xl border border-red-200 bg-red-50 dark:bg-red-900/20 dark:border-red-800 text-center">
        <p className="text-red-700 dark:text-red-300 font-medium mb-4">
          {phase === 'invalid' ? t('invalid_token') : t('expired_token')}
        </p>
        <Link
          href="/"
          className="inline-flex items-center justify-center py-2.5 px-4 rounded-lg bg-brand-500 text-white font-medium hover:bg-brand-600 transition-colors"
        >
          {t('back_home')}
        </Link>
      </div>
    );
  }

  if (phase === 'consumed') {
    return (
      <div className="mt-8 p-6 rounded-xl border border-neutral-200 bg-neutral-50 dark:bg-neutral-900 dark:border-neutral-700 text-center">
        <p className="text-neutral-700 dark:text-neutral-300 font-medium">{t('consumed_token')}</p>
        {requestNumber && (
          <p className="mt-2 text-neutral-500 dark:text-neutral-400">
            {t('consumed_request_number', { request_number: requestNumber })}
          </p>
        )}
        <Link
          href="/"
          className="mt-4 inline-flex items-center justify-center py-2.5 px-4 rounded-lg bg-brand-500 text-white font-medium hover:bg-brand-600 transition-colors"
        >
          {t('back_home')}
        </Link>
      </div>
    );
  }

  if (phase === 'success') {
    return (
      <div className="mt-8 p-6 rounded-xl border border-green-200 bg-green-50 dark:bg-green-900/20 dark:border-green-800 text-center">
        <h2 className="text-2xl font-bold text-green-800 dark:text-green-300 mb-2">{t('success_title')}</h2>
        <p className="text-green-700 dark:text-green-300">
          {t('success_message', { name: contact?.name ?? '' })}
        </p>
        {requestNumber && (
          <p className="mt-4 text-green-800 dark:text-green-300 font-semibold">
            {t('request_number_label')}: {requestNumber}
          </p>
        )}
        <Link
          href="/"
          className="mt-6 inline-flex items-center justify-center py-2.5 px-4 rounded-lg bg-brand-500 text-white font-medium hover:bg-brand-600 transition-colors"
        >
          {t('back_home')}
        </Link>
      </div>
    );
  }

  const submitting = phase === 'submitting';

  return (
    <div className="mt-8">
      {contact && (
        <div className="mb-6 p-6 rounded-2xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900">
          <h2 className="text-lg font-semibold mb-3">{t('your_info')}</h2>
          <p className="text-neutral-700 dark:text-neutral-300">{contact.name}</p>
          <p className="text-neutral-500 dark:text-neutral-400">{contact.phone}</p>
          <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-300">
            <span className="font-medium">{t('service_label')}: </span>
            {contact.service_name ?? t('service_unknown')}
          </p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        <div>
          <label htmlFor={`${baseId}-address`} className="block text-sm font-medium mb-1">
            {t('address')}
          </label>
          <input
            id={`${baseId}-address`}
            type="text"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            required
            maxLength={2000}
            autoComplete="street-address"
            className={inputClass}
            placeholder={t('address_placeholder')}
            disabled={submitting}
          />
        </div>

        {districts.length > 0 && (
          <div>
            <label htmlFor={`${baseId}-district`} className="block text-sm font-medium mb-1">
              {t('district')}
            </label>
            <select
              id={`${baseId}-district`}
              value={districtId}
              onChange={(e) => setDistrictId(e.target.value)}
              className={inputClass}
              disabled={submitting}
            >
              <option value="">{t('district_placeholder')}</option>
              {districts.map((district) => (
                <option key={district.id} value={district.id}>
                  {district.translations.find((tr) => tr.locale === locale)?.name ||
                    district.translations[0]?.name ||
                    district.slug}
                </option>
              ))}
            </select>
          </div>
        )}

        <fieldset>
          <legend className="block text-sm font-medium mb-2">{t('location_title')}</legend>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor={`${baseId}-lat`} className="block text-sm font-medium mb-1">
                {t('latitude')}
              </label>
              <input
                id={`${baseId}-lat`}
                type="number"
                step="any"
                min={-90}
                max={90}
                value={latitude}
                onChange={(e) => setLatitude(e.target.value)}
                className={inputClass}
                disabled={submitting || geoStatus === 'locating'}
              />
            </div>
            <div>
              <label htmlFor={`${baseId}-lng`} className="block text-sm font-medium mb-1">
                {t('longitude')}
              </label>
              <input
                id={`${baseId}-lng`}
                type="number"
                step="any"
                min={-180}
                max={180}
                value={longitude}
                onChange={(e) => setLongitude(e.target.value)}
                className={inputClass}
                disabled={submitting || geoStatus === 'locating'}
              />
            </div>
          </div>
          <div className="mt-3">
            <button
              type="button"
              onClick={handleUseLocation}
              disabled={submitting || geoStatus === 'locating'}
              className="py-2 px-4 rounded-lg border border-brand-500 text-brand-600 dark:text-brand-400 font-medium hover:bg-brand-50 dark:hover:bg-brand-900/20 disabled:opacity-50 transition-colors"
            >
              {geoStatus === 'locating' ? t('locating') : t('use_location')}
            </button>
            {geoStatus === 'success' && (
              <p className="mt-2 text-sm text-green-600 dark:text-green-400">{t('location_success')}</p>
            )}
            {geoStatus === 'denied' && (
              <p className="mt-2 text-sm text-red-500">{t('location_denied')}</p>
            )}
            {geoStatus === 'unavailable' && (
              <p className="mt-2 text-sm text-red-500">{t('location_unavailable')}</p>
            )}
          </div>
        </fieldset>

        <div>
          <label htmlFor={`${baseId}-description`} className="block text-sm font-medium mb-1">
            {t('description')}
          </label>
          <textarea
            id={`${baseId}-description`}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            required
            rows={4}
            maxLength={2000}
            className={`${inputClass} resize-none`}
            placeholder={t('description_placeholder')}
            disabled={submitting}
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor={`${baseId}-date`} className="block text-sm font-medium mb-1">
              {t('preferred_date')}
            </label>
            <input
              id={`${baseId}-date`}
              type="date"
              min={today}
              value={preferredDate}
              onChange={(e) => setPreferredDate(e.target.value)}
              required
              className={inputClass}
              disabled={submitting}
            />
          </div>
          <div>
            <label htmlFor={`${baseId}-time`} className="block text-sm font-medium mb-1">
              {t('preferred_time')}
            </label>
            <input
              id={`${baseId}-time`}
              type="time"
              value={preferredTime}
              onChange={(e) => setPreferredTime(e.target.value)}
              required
              className={inputClass}
              disabled={submitting}
            />
          </div>
        </div>

        <fieldset>
          <legend className="block text-sm font-medium mb-1">{t('images_title')}</legend>
          <p className="text-sm text-neutral-500 dark:text-neutral-400 mb-3">{t('images_hint')}</p>

          <input
            ref={fileInputRef}
            id={`${baseId}-files`}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            multiple
            className="sr-only"
            onChange={handleFiles}
            disabled={submitting || uploading}
          />

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={submitting || uploading || images.length >= MAX_REQUEST_IMAGES}
            className="py-2 px-4 rounded-lg border border-dashed border-neutral-300 dark:border-neutral-600 text-neutral-600 dark:text-neutral-300 font-medium hover:border-brand-500 hover:text-brand-500 disabled:opacity-50 transition-colors"
          >
            {t('upload_images')}
          </button>

          {images.length > 0 && (
            <ul className="mt-4 grid gap-3 sm:grid-cols-2 md:grid-cols-3">
              {images.map((img, index) => (
                <li key={img.preview} className="relative group">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={img.preview}
                    alt={`${t('upload_images')} ${index + 1}`}
                    className="h-32 w-full object-cover rounded-lg border border-neutral-200 dark:border-neutral-700"
                  />
                  <button
                    type="button"
                    onClick={() => removeImage(index)}
                    disabled={submitting || uploading}
                    aria-label={t('remove_image')}
                    className="absolute top-1.5 right-1.5 p-1.5 rounded-full bg-black/60 text-white hover:bg-black/80 disabled:opacity-50 transition-colors"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
                      <path d="M18 6L6 18M6 6l12 12" />
                    </svg>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </fieldset>

        <div aria-live="polite">
          {errorKey && <p className="text-red-500 text-sm">{t(errorKey)}</p>}
        </div>

        <button
          type="submit"
          disabled={submitting || uploading}
          className="w-full py-3 px-4 rounded-lg bg-brand-500 text-white font-medium hover:bg-brand-600 disabled:opacity-50 transition-colors"
        >
          {uploading
            ? t('uploading_images')
            : submitting
              ? t('submitting')
              : t('submit')}
        </button>
      </form>
    </div>
  );
}
