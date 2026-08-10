"""The seed script is the catalogue mechanism for services.

These tests guard the data definition itself: every seeded service (including
the electrician and CCTV additions) must carry the exact fields the Service
model requires and complete AR/FR/EN translations.
"""
from scripts.seed import SERVICES_DATA

EXPECTED_LOCALES = {'en', 'fr', 'ar'}
REQUIRED_TRANSLATION_KEYS = {'name', 'description', 'meta_title', 'meta_desc'}


def test_seed_service_slugs_are_unique():
    slugs = [s['slug'] for s in SERVICES_DATA]
    assert len(slugs) == len(set(slugs))
    assert len(slugs) >= 10


def test_seed_catalogue_includes_the_new_services():
    by_slug = {s['slug']: s for s in SERVICES_DATA}
    assert 'electrician' in by_slug
    assert 'cctv-surveillance' in by_slug


def test_every_seed_service_has_complete_localized_translations():
    for svc in SERVICES_DATA:
        assert svc['icon'], f'{svc["slug"]} is missing an icon'
        assert isinstance(svc['sort_order'], int), f'{svc["slug"]} sort_order must be an int'
        translations = svc['translations']
        assert set(translations) == EXPECTED_LOCALES, f'{svc["slug"]} must have en/fr/ar'
        for locale in EXPECTED_LOCALES:
            tr = translations[locale]
            assert REQUIRED_TRANSLATION_KEYS <= set(tr), f'{svc["slug"]} missing keys for {locale}'
            assert tr['name'].strip(), f'{svc["slug"]} missing name for {locale}'
            assert tr['description'].strip(), f'{svc["slug"]} missing description for {locale}'
            assert tr['meta_title'].strip(), f'{svc["slug"]} missing meta_title for {locale}'
            assert tr['meta_desc'].strip(), f'{svc["slug"]} missing meta_desc for {locale}'
