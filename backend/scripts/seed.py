"""Seed script for MVP data: 10 services, 3 technicians, 8 districts, settings.

Usage:
    python scripts/seed.py
"""
import asyncio
import uuid
import json
import os
import re
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from app.core.config import settings

from sqlalchemy import select
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker

from app.models.service import Service, ServiceTranslation
from app.models.technician import Technician, TechnicianTranslation, TechnicianService, TechnicianDistrict
from app.models.district import District, DistrictTranslation
from app.models.settings import Setting
from app.models.media import Media


SERVICES_DATA = [
    {
        'slug': 'air-conditioner-installation',
        'icon': 'snowflake',
        'sort_order': 1,
        'translations': {
            'en': {
                'name': 'Air Conditioner Installation',
                'description': 'Professional installation of all types of air conditioning units. Split systems, central AC, and window units. We ensure proper sizing, efficient placement, and quality workmanship.',
                'meta_title': 'AC Installation Marrakech | Professional Air Conditioner Installers',
                'meta_desc': 'Expert air conditioner installation in Marrakech. Split systems, central AC. Fast, professional service with warranty. Call now for a free quote.',
            },
            'fr': {
                'name': 'Installation de Climatiseur',
                'description': 'Installation professionnelle de tous types de climatiseurs. Systèmes split, climatisation centrale et unités murales. Installation rapide et soignée avec garantie.',
                'meta_title': 'Installation Climatiseur Marrakech | Professionnels Agréés',
                'meta_desc': 'Installation de climatiseur à Marrakech. Split, centrale, mural. Service professionnel et rapide avec garantie. Devis gratuit.',
            },
            'ar': {
                'name': 'تركيب مكيف الهواء',
                'description': 'تركيب احترافي لجميع أنواع مكيفات الهواء. أنظمة سبليت وتكييف مركزي. نضمن التركيب السليم والحجم المناسب وجودة العمل.',
                'meta_title': 'تركيب مكيف الهواء مراكش | فنيين محترفين',
                'meta_desc': 'تركيب مكيف الهواء في مراكش. سبليت وتكييف مركزي. خدمة سريعة واحترافية مع ضمان. اتصل الآن للحصول على عرض سعر.',
            },
        },
    },
    {
        'slug': 'air-conditioner-repair',
        'icon': 'tool',
        'sort_order': 2,
        'translations': {
            'en': {
                'name': 'Air Conditioner Repair',
                'description': 'Fast and reliable repair services for all AC brands and models. From minor issues to major breakdowns, our technicians diagnose and fix the problem quickly.',
                'meta_title': 'AC Repair Marrakech | Fast Air Conditioner Fix',
                'meta_desc': 'Rapid air conditioner repair in Marrakech. All brands and models. Expert diagnosis, fair pricing, same-day service available.',
            },
            'fr': {
                'name': 'Réparation de Climatiseur',
                'description': 'Réparation rapide et fiable pour toutes les marques et modèles de climatiseurs. Diagnostic expert et réparation le jour même.',
                'meta_title': 'Réparation Climatiseur Marrakech | Dépannage Rapide',
                'meta_desc': 'Réparation de climatiseur à Marrakech. Toutes marques. Diagnostic expert, prix justes, intervention le jour même.',
            },
            'ar': {
                'name': 'إصلاح مكيف الهواء',
                'description': 'خدمات إصلاح سريعة وموثوقة لجميع ماركات وموديلات المكيفات. تشخيص خبير وإصلاح في نفس اليوم.',
                'meta_title': 'إصلاح مكيف الهواء مراكش | تصليح سريع',
                'meta_desc': 'إصلاح مكيف الهواء في مراكش. جميع الماركات. تشخيص خبير، أسعار مناسبة، خدمة في نفس اليوم.',
            },
        },
    },
    {
        'slug': 'air-conditioner-maintenance',
        'icon': 'refresh-cw',
        'sort_order': 3,
        'translations': {
            'en': {
                'name': 'Air Conditioner Maintenance',
                'description': 'Regular maintenance keeps your AC running efficiently and extends its lifespan. Cleaning, filter replacement, gas check, and performance tuning.',
                'meta_title': 'AC Maintenance Marrakech | Regular Service Plans',
                'meta_desc': 'Professional AC maintenance in Marrakech. Cleaning, filters, gas check, tune-ups. Extend your AC lifespan with regular service.',
            },
            'fr': {
                'name': 'Entretien de Climatiseur',
                'description': "L'entretien régulier maintient votre climatiseur efficace et prolonge sa durée de vie. Nettoyage, remplacement des filtres, vérification du gaz.",
                'meta_title': 'Entretien Climatiseur Marrakech | Forfaits Service',
                'meta_desc': "Entretien professionnel de climatiseur à Marrakech. Nettoyage, filtres, gaz, réglages. Prolongez la durée de vie de votre AC.",
            },
            'ar': {
                'name': 'صيانة مكيف الهواء',
                'description': 'الصيانة الدورية تحافظ على كفاءة مكيف الهواء وتطيل عمره. تنظيف، استبدال الفلاتر، فحص الغاز، وضبط الأداء.',
                'meta_title': 'صيانة مكيف الهواء مراكش | عقود خدمة دورية',
                'meta_desc': 'صيانة احترافية لمكيف الهواء في مراكش. تنظيف، فلاتر، غاز، ضبط. أطيل عمر مكيفك بخدمة دورية.',
            },
        },
    },
    {
        'slug': 'ventilation-systems',
        'icon': 'wind',
        'sort_order': 4,
        'translations': {
            'en': {
                'name': 'Ventilation Systems',
                'description': 'Installation and maintenance of ventilation systems for homes, offices, and commercial spaces. Improve air quality and comfort.',
                'meta_title': 'Ventilation Systems Marrakech | Air Quality Solutions',
                'meta_desc': 'Ventilation system installation and maintenance in Marrakech. For homes, offices, restaurants. Improve indoor air quality.',
            },
            'fr': {
                'name': 'Systèmes de Ventilation',
                'description': 'Installation et entretien de systèmes de ventilation pour maisons, bureaux et commerces. Améliorez la qualité de votre air intérieur.',
                'meta_title': 'Ventilation Marrakech | Solutions Qualité Air',
                'meta_desc': "Installation et entretien de ventilation à Marrakech. Maisons, bureaux, restaurants. Améliorez votre qualité d'air.",
            },
            'ar': {
                'name': 'أنظمة التهوية',
                'description': 'تركيب وصيانة أنظمة التهوية للمنازل والمكاتب والمساحات التجارية. تحسين جودة الهواء والراحة.',
                'meta_title': 'أنظمة التهوية مراكش | حلول جودة الهواء',
                'meta_desc': 'تركيب وصيانة أنظمة التهوية في مراكش. للمنازل والمكاتب والمطاعم. تحسين جودة الهواء الداخلي.',
            },
        },
    },
    {
        'slug': 'refrigerators',
        'icon': 'refrigerator',
        'sort_order': 5,
        'translations': {
            'en': {
                'name': 'Refrigerators',
                'description': 'Repair and maintenance of all types of refrigerators. From household fridges to commercial refrigeration units. Fast diagnosis and reliable fixes.',
                'meta_title': 'Refrigerator Repair Marrakech | Fridge Fix',
                'meta_desc': 'Professional refrigerator repair in Marrakech. All types and brands. Fast diagnosis, fair prices, reliable service.',
            },
            'fr': {
                'name': 'Réfrigérateurs',
                'description': 'Réparation et entretien de tous types de réfrigérateurs. Du réfrigérateur domestique aux unités de réfrigération commerciale.',
                'meta_title': 'Réparation Réfrigérateur Marrakech | Dépannage Frigo',
                'meta_desc': 'Réparation professionnelle de réfrigérateur à Marrakech. Tous types et marques. Diagnostic rapide, prix justes.',
            },
            'ar': {
                'name': 'الثلاجات',
                'description': 'إصلاح وصيانة جميع أنواع الثلاجات. من الثلاجات المنزلية إلى وحدات التبريد التجارية. تشخيص سريع وإصلاح موثوق.',
                'meta_title': 'إصلاح ثلاجة مراكش | تصليح ثلاجات',
                'meta_desc': 'إصلاح احترافي للثلاجات في مراكش. جميع الأنواع والماركات. تشخيص سريع، أسعار مناسبة، خدمة موثوقة.',
            },
        },
    },
    {
        'slug': 'freezers',
        'icon': 'ice-cream',
        'sort_order': 6,
        'translations': {
            'en': {
                'name': 'Freezers',
                'description': 'Expert repair and maintenance for all freezer types. Chest freezers, upright freezers, and commercial freezing units.',
                'meta_title': 'Freezer Repair Marrakech | Freezer Maintenance',
                'meta_desc': 'Professional freezer repair and maintenance in Marrakech. Chest, upright, commercial. Fast service, experienced technicians.',
            },
            'fr': {
                'name': 'Congélateurs',
                'description': 'Réparation et entretien expert pour tous types de congélateurs. Congélateurs coffre, armoire et unités de congélation commerciale.',
                'meta_title': 'Réparation Congélateur Marrakech | Entretien',
                'meta_desc': 'Réparation professionnelle de congélateur à Marrakech. Coffre, armoire, commercial. Service rapide.',
            },
            'ar': {
                'name': 'المجمدات',
                'description': 'إصلاح وصيانة خبيرة لجميع أنواع المجمدات. المجمدات الصندوقية والقائمة ووحدات التجميد التجارية.',
                'meta_title': 'إصلاح مجمد مراكش | صيانة مجمدات',
                'meta_desc': 'إصلاح وصيانة احترافية للمجمدات في مراكش. صندوقية، قائمة، تجارية. خدمة سريعة.',
            },
        },
    },
    {
        'slug': 'washing-machines',
        'icon': 'shirt',
        'sort_order': 7,
        'translations': {
            'en': {
                'name': 'Washing Machines',
                'description': 'Repair and maintenance for all washing machine brands and models. From minor issues to major repairs, we handle it all.',
                'meta_title': 'Washing Machine Repair Marrakech | Washer Fix',
                'meta_desc': 'Professional washing machine repair in Marrakech. All brands. Quick diagnosis, reliable repairs, fair pricing.',
            },
            'fr': {
                'name': 'Machines à Laver',
                'description': 'Réparation et entretien pour toutes les marques et modèles de machines à laver. Diagnostic rapide et réparation fiable.',
                'meta_title': 'Réparation Machine à Laver Marrakech | Dépannage',
                'meta_desc': 'Réparation professionnelle de machine à laver à Marrakech. Toutes marques. Diagnostic rapide, réparation fiable.',
            },
            'ar': {
                'name': 'غسالات الملابس',
                'description': 'إصلاح وصيانة لجميع ماركات وموديلات غسالات الملابس. من الأعطال البسيطة إلى الإصلاحات الكبيرة.',
                'meta_title': 'إصلاح غسالة ملابس مراكش | تصليح غسالات',
                'meta_desc': 'إصلاح احترافي لغسالات الملابس في مراكش. جميع الماركات. تشخيص سريع، إصلاح موثوق، أسعار مناسبة.',
            },
        },
    },
    {
        'slug': 'water-heaters',
        'icon': 'thermometer',
        'sort_order': 8,
        'translations': {
            'en': {
                'name': 'Water Heaters',
                'description': 'Installation, repair, and maintenance of water heaters. Electric, gas, and solar water heating systems. Reliable hot water solutions.',
                'meta_title': 'Water Heater Repair Marrakech | Installation & Service',
                'meta_desc': 'Water heater installation, repair, and maintenance in Marrakech. Electric, gas, solar. Reliable hot water solutions.',
            },
            'fr': {
                'name': 'Chauffe-eaux',
                'description': 'Installation, réparation et entretien de chauffe-eaux. Systèmes électriques, gaz et solaires. Solutions fiables pour votre eau chaude.',
                'meta_title': 'Réparation Chauffe-eau Marrakech | Installation',
                'meta_desc': 'Installation, réparation et entretien de chauffe-eau à Marrakech. Électrique, gaz, solaire. Solutions eau chaude.',
            },
            'ar': {
                'name': 'سخانات المياه',
                'description': 'تركيب وإصلاح وصيانة سخانات المياه. أنظمة كهربائية وغازية وشمسية. حلول موثوقة للمياه الساخنة.',
                'meta_title': 'إصلاح سخان مياه مراكش | تركيب وصيانة',
                'meta_desc': 'تركيب وإصلاح وصيانة سخانات المياه في مراكش. كهربائية، غاز، شمسية. حلول موثوقة للمياه الساخنة.',
            },
        },
    },
    {
        'slug': 'electrician',
        'icon': 'zap',
        'sort_order': 9,
        'translations': {
            'en': {
                'name': 'Electrical Services',
                'description': 'Professional electrical services for homes and businesses. Wiring, lighting installation, panel upgrades, fault diagnosis and repairs by certified electricians.',
                'meta_title': 'Electrician Marrakech | Certified Electrical Services',
                'meta_desc': 'Certified electrician in Marrakech. Wiring, lighting, panel upgrades, fault repair. Safe, fast, professional service. Call now.',
            },
            'fr': {
                'name': 'Électricité',
                'description': 'Services électriques professionnels pour particuliers et entreprises. Câblage, installation d\'éclairage, mise à niveau de tableaux, diagnostic de pannes et réparations par des électriciens certifiés.',
                'meta_title': 'Électricien Marrakech | Services Électriques Certifiés',
                'meta_desc': 'Électricien certifié à Marrakech. Câblage, éclairage, tableaux électriques, dépannage. Service sûr, rapide et professionnel. Appelez maintenant.',
            },
            'ar': {
                'name': 'الكهرباء',
                'description': 'خدمات كهربائية احترافية للمنازل والشركات. توصيلات كهربائية، تركيب إضاءة، ترقية لوحات التوزيع، تشخيص الأعطال وإصلاحها على يد كهربائيين معتمدين.',
                'meta_title': 'كهربائي مراكش | خدمات كهربائية معتمدة',
                'meta_desc': 'كهربائي معتمد في مراكش. توصيلات، إضاءة، لوحات كهربائية، إصلاح أعطال. خدمة آمنة وسريعة واحترافية. اتصل الآن.',
            },
        },
    },
    {
        'slug': 'cctv-surveillance',
        'icon': 'camera',
        'sort_order': 10,
        'translations': {
            'en': {
                'name': 'CCTV & Surveillance',
                'description': 'Installation and repair of CCTV and surveillance camera systems. Indoor and outdoor cameras, recording equipment, remote viewing, and system setup for homes and businesses.',
                'meta_title': 'CCTV Installation Marrakech | Surveillance Camera Technician',
                'meta_desc': 'CCTV and surveillance camera installation and repair in Marrakech. Indoor and outdoor cameras, recorders, remote viewing. Call now.',
            },
            'fr': {
                'name': 'Caméras de surveillance',
                'description': 'Installation et réparation de systèmes de caméras de surveillance et CCTV. Caméras intérieures et extérieures, enregistreurs, visualisation à distance et configuration pour particuliers et entreprises.',
                'meta_title': 'Installation CCTV Marrakech | Technicien Caméras de Surveillance',
                'meta_desc': 'Installation et réparation de caméras de surveillance à Marrakech. Caméras intérieures et extérieures, enregistreurs, visionnage à distance. Appelez maintenant.',
            },
            'ar': {
                'name': 'كاميرات المراقبة',
                'description': 'تركيب وإصلاح أنظمة كاميرات المراقبة. كاميرات داخلية وخارجية، أجهزة تسجيل، مشاهدة عن بعد وإعداد الأنظمة للمنازل والشركات.',
                'meta_title': 'تركيب كاميرات مراقبة مراكش | فني كاميرات مراقبة',
                'meta_desc': 'تركيب وإصلاح كاميرات المراقبة في مراكش. كاميرات داخلية وخارجية، مسجلات، مشاهدة عن بعد. اتصل الآن.',
            },
        },
    },
]

TECHNICIANS_DATA = [
    {
        'name': 'Ahmed Benali',
        'slug': 'ahmed-benali',
        'phone': '+212612345678',
        'whatsapp': '+212612345678',
        'email': 'ahmed.benali@example.com',
        'photo_url': 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=400&fit=crop',
        'rating': 5,
        'review_count': 28,
        'service_area': 'Marrakech - Gueliz, Hivernage, Semlalia',
        'working_hours': {
            'mon': '8:00 - 18:00',
            'tue': '8:00 - 18:00',
            'wed': '8:00 - 18:00',
            'thu': '8:00 - 18:00',
            'fri': '8:00 - 17:00',
            'sat': '9:00 - 14:00',
            'sun': 'closed',
        },
        'languages': ['Arabic', 'French', 'English'],
        'years_exp': 12,
        'is_featured': True,
        'translations': {
            'en': {'bio': 'Over 12 years of experience in HVAC and home appliance repair. Certified technician specializing in AC installation, repair, and maintenance. Known for prompt service and quality workmanship.'},
            'fr': {'bio': "Plus de 12 ans d'expérience en HVAC et réparation d'électroménager. Technicien certifié spécialisé en installation, réparation et entretien de climatiseurs. Réputé pour son service rapide et son travail de qualité."},
            'ar': {'bio': 'أكثر من 12 عاماً من الخبرة في تكييف الهواء وإصلاح الأجهزة المنزلية. فني معتمد متخصص في تركيب وإصلاح وصيانة المكيفات. معروف بالخدمة السريعة وجودة العمل.'},
        },
        'photos': [
            {'url': 'https://images.unsplash.com/photo-1621905252507-b35492cc74b4?w=800&h=600&fit=crop', 'caption': 'AC installation project', 'sort_order': 1},
            {'url': 'https://images.unsplash.com/photo-1581092918056-0c4c3acd3789?w=800&h=600&fit=crop', 'caption': 'Repair work', 'sort_order': 2},
        ],
        'services': [
            ('air-conditioner-installation', 300, 500),
            ('air-conditioner-repair', 200, 400),
            ('air-conditioner-maintenance', 150, 250),
            ('ventilation-systems', 400, 700),
            ('refrigerators', 200, 400),
        ],
        'districts': ['gueliz', 'hivernage', 'medina'],
    },
    {
        'name': 'Youssef El Idrissi',
        'slug': 'youssef-el-idrissi',
        'phone': '+212612345679',
        'whatsapp': '+212612345679',
        'email': 'youssef.idrissi@example.com',
        'photo_url': 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&h=400&fit=crop',
        'rating': 5,
        'review_count': 19,
        'service_area': 'Marrakech - Medina, Bab Doukkala, Sidi Youssef Ben Ali',
        'working_hours': {
            'mon': '9:00 - 19:00',
            'tue': '9:00 - 19:00',
            'wed': '9:00 - 19:00',
            'thu': '9:00 - 19:00',
            'fri': '9:00 - 17:00',
            'sat': '9:00 - 14:00',
            'sun': 'closed',
        },
        'languages': ['Arabic', 'French'],
        'years_exp': 8,
        'is_featured': True,
        'translations': {
            'en': {'bio': 'Skilled technician with 8 years of experience in refrigeration, freezing, and washing machine repair. Specializes in diagnosing complex issues and providing lasting solutions.'},
            'fr': {'bio': "Technicien qualifié avec 8 ans d'expérience en réfrigération, congélation et réparation de machines à laver. Spécialisé dans le diagnostic de problèmes complexes et la fourniture de solutions durables."},
            'ar': {'bio': 'فني ماهر لديه 8 سنوات من الخبرة في إصلاح الثلاجات والمجمدات وغسالات الملابس. متخصص في تشخيص المشاكل المعقدة وتقديم حلول دائمة.'},
        },
        'photos': [
            {'url': 'https://images.unsplash.com/photo-1571171637578-41bc2dd41cd2?w=800&h=600&fit=crop', 'caption': 'Refrigerator repair', 'sort_order': 1},
        ],
        'services': [
            ('refrigerators', 150, 350),
            ('freezers', 200, 400),
            ('washing-machines', 150, 300),
            ('air-conditioner-repair', 200, 400),
        ],
        'districts': ['medina', 'sidi-youssef-ben-ali', 'oudaia'],
    },
    {
        'name': 'Hassan Ouazzani',
        'slug': 'hassan-ouazzani',
        'phone': '+212612345680',
        'whatsapp': '+212612345680',
        'email': 'hassan.ouazzani@example.com',
        'photo_url': 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400&h=400&fit=crop',
        'rating': 4,
        'review_count': 15,
        'service_area': 'Marrakech - Menara, Massira, Targa',
        'working_hours': {
            'mon': '8:30 - 18:30',
            'tue': '8:30 - 18:30',
            'wed': '8:30 - 18:30',
            'thu': '8:30 - 18:30',
            'fri': '8:30 - 17:00',
            'sat': '10:00 - 16:00',
            'sun': 'closed',
        },
        'languages': ['Arabic', 'French', 'English'],
        'years_exp': 15,
        'is_featured': False,
        'translations': {
            'en': {'bio': 'Veteran technician with 15 years of experience across all home appliances. Expert in water heaters, ventilation systems, and general appliance repair. Trusted by hotels and restaurants in Marrakech.'},
            'fr': {'bio': "Technicien vétéran avec 15 ans d'expérience dans tous les appareils électroménagers. Expert en chauffe-eaux, systèmes de ventilation et réparation d'appareils. Approuvé par les hôtels et restaurants de Marrakech."},
            'ar': {'bio': 'فني مخضرم لديه 15 عاماً من الخبرة في جميع الأجهزة المنزلية. خبير في سخانات المياه وأنظمة التهوية وإصلاح الأجهزة العامة. موثوق من قبل الفنادق والمطاعم في مراكش.'},
        },
        'photos': [
            {'url': 'https://images.unsplash.com/photo-1581092795360-fd1ca04f0952?w=800&h=600&fit=crop', 'caption': 'Water heater installation', 'sort_order': 1},
            {'url': 'https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?w=800&h=600&fit=crop', 'caption': 'Ventilation system maintenance', 'sort_order': 2},
        ],
        'services': [
            ('water-heaters', 250, 500),
            ('ventilation-systems', 400, 700),
            ('air-conditioner-installation', 300, 500),
            ('air-conditioner-maintenance', 150, 250),
            ('washing-machines', 150, 300),
        ],
        'districts': ['palmeraie', 'gueliz', 'nassim'],
    },
]

DISTRICTS_DATA = [
    {
        'slug': 'gueliz',
        'sort_order': 1,
        'translations': {
            'en': {'name': 'Guéliz', 'description': 'Modern district of Marrakech, home to shops, restaurants, and the main train station.'},
            'fr': {'name': 'Guéliz', 'description': 'Quartier moderne de Marrakech, abritant commerces, restaurants et la gare principale.'},
            'ar': {'name': 'كيليز', 'description': 'الحي الحديث في مراكش، يضم المتاجر والمطاعم ومحطة القطار الرئيسية.'},
        },
    },
    {
        'slug': 'medina',
        'sort_order': 2,
        'translations': {
            'en': {'name': 'Medina', 'description': 'The historic old city of Marrakech, a UNESCO World Heritage site with souks and riads.'},
            'fr': {'name': 'Médina', 'description': "L'ancienne ville historique de Marrakech, site du patrimoine mondial de l'UNESCO avec ses souks et riads."},
            'ar': {'name': 'المدينة', 'description': 'المدينة القديمة التاريخية في مراكش، موقع تراث عالمي لليونسكو مع أسواقها وأكواخها.'},
        },
    },
    {
        'slug': 'hivernage',
        'sort_order': 3,
        'translations': {
            'en': {'name': 'Hivernage', 'description': 'Upscale district with luxury hotels, convention centers, and the Royal Theatre.'},
            'fr': {'name': 'Hivernage', 'description': 'Quartier huppé avec hôtels de luxe, centres de congrès et le Théâtre Royal.'},
            'ar': {'name': 'إيفرناج', 'description': 'حي راقٍ يضم فنادق فاخرة ومراكز مؤتمرات والمسرح الملكي.'},
        },
    },
    {
        'slug': 'palmeraie',
        'sort_order': 4,
        'translations': {
            'en': {'name': 'Palmeraie', 'description': 'Palm grove area north of the city with resorts, golf courses, and luxury villas.'},
            'fr': {'name': 'Palmeraie', 'description': 'Zone palmière au nord de la ville avec stations, terrains de golf et villas de luxe.'},
            'ar': {'name': 'بالميراي', 'description': 'منطقة النخيل شمال المدينة تضم منتجعات وملاعب غولف وفلل فاخرة.'},
        },
    },
    {
        'slug': 'sidi-youssef-ben-ali',
        'sort_order': 5,
        'translations': {
            'en': {'name': 'Sidi Youssef Ben Ali', 'description': 'Vibrant neighborhood known for its local markets, street food, and authentic atmosphere.'},
            'fr': {'name': 'Sidi Youssef Ben Ali', 'description': 'Quartier vibrant connu pour ses marchés locaux, sa street food et son atmosphère authentique.'},
            'ar': {'name': 'سيدي يوسف بن علي', 'description': 'حي نابض بالحياة معروف بأسواقه المحلية وطعام الشارع وأجوائه الأصيلة.'},
        },
    },
    {
        'slug': 'oudaia',
        'sort_order': 6,
        'translations': {
            'en': {'name': "L'Oudaiâa", 'description': 'Historic quarter near the Kasbah with narrow streets, art galleries, and the famous Café Glaciale.'},
            'fr': {'name': "L'Oudaiâa", 'description': 'Quartier historique près de la Kasbah avec rues étroites, galeries d\'art et le célèbre Café Glaciale.'},
            'ar': {'name': 'العدايقة', 'description': 'حي تاريخي بالقرب من القصبة بأزقته الضيقة وم galeriاته والمقهى الشهير.'},
        },
    },
    {
        'slug': 'sidi-bernoussi',
        'sort_order': 7,
        'translations': {
            'en': {'name': 'Sidi Bernoussi', 'description': 'Residential district with a mix of traditional and modern housing.'},
            'fr': {'name': 'Sidi Bernoussi', 'description': 'Quartier résidentiel avec un mélange de logements traditionnels et modernes.'},
            'ar': {'name': 'سيدي برنوسي', 'description': 'حي سكني يضم مزيجاً من السكنات التقليدية والعصرية.'},
        },
    },
    {
        'slug': 'nassim',
        'sort_order': 8,
        'translations': {
            'en': {'name': 'Nassim', 'description': 'Growing residential area with new developments and family-friendly amenities.'},
            'fr': {'name': 'Nassim', 'description': 'Zone résidentielle en développement avec de nouvelles constructions et des équipements familiaux.'},
            'ar': {'name': 'النسيم', 'description': 'منطقة سكنية متنامية مع تطويرات جديدة ومرافق عائلية.'},
        },
    },
]

SETTINGS_DATA = [
    ('site_name', 'Mudel'),
    ('support_phone', '+212691869602'),
    ('whatsapp_number', '+212691869602'),
    ('contact_email', 'hello@mudel.ma'),
    ('working_hours', json.dumps({
        'mon': '08:00-18:00',
        'tue': '08:00-18:00',
        'wed': '08:00-18:00',
        'thu': '08:00-18:00',
        'fri': '09:00-13:00',
        'sat': '08:00-18:00',
        'sun': 'closed',
    })),
]


async def seed():
    database_url = settings.database_url.replace(
        "postgresql://",
        "postgresql+asyncpg://",
    )
    safe_url = re.sub(r'://([^:]+):[^@]+@', r'://\1:***@', database_url)
    print(f"Connecting to: {safe_url}")
    engine = create_async_engine(
        database_url,
        connect_args={
            "statement_cache_size": 0,
            "prepared_statement_cache_size": 0,
            "prepared_statement_name_func": lambda: f"__asyncpg_{uuid.uuid4().hex}__",
            "ssl": "require",
        },
    )
    session_factory = async_sessionmaker(engine, class_=AsyncSession)

    async with session_factory() as session:
        # --- Services ---
        for svc_data in SERVICES_DATA:
            service = Service(
                slug=svc_data['slug'],
                icon=svc_data['icon'],
                sort_order=svc_data['sort_order'],
            )
            session.add(service)
            await session.flush()

            for locale, t in svc_data['translations'].items():
                translation = ServiceTranslation(
                    service_id=service.id,
                    locale=locale,
                    name=t['name'],
                    description=t['description'],
                    meta_title=t['meta_title'],
                    meta_desc=t['meta_desc'],
                )
                session.add(translation)

        # Build slug→service map
        result = await session.execute(select(Service))
        services_map = {s.slug: s for s in result.scalars().all()}

        # --- Districts ---
        for dist_data in DISTRICTS_DATA:
            district = District(
                slug=dist_data['slug'],
                sort_order=dist_data['sort_order'],
            )
            session.add(district)
            await session.flush()

            for locale, t in dist_data['translations'].items():
                translation = DistrictTranslation(
                    district_id=district.id,
                    locale=locale,
                    name=t['name'],
                    description=t['description'],
                )
                session.add(translation)

        # Build slug→district map
        result = await session.execute(select(District))
        districts_map = {d.slug: d for d in result.scalars().all()}

        # --- Settings ---
        for key, value in SETTINGS_DATA:
            session.add(Setting(key=key, value=value))

        # --- Technicians ---
        for tech_data in TECHNICIANS_DATA:
            tech = Technician(
                name=tech_data['name'],
                slug=tech_data['slug'],
                phone=tech_data['phone'],
                whatsapp=tech_data['whatsapp'],
                email=tech_data['email'],
                photo_url=tech_data['photo_url'],
                rating=tech_data['rating'],
                review_count=tech_data['review_count'],
                service_area=tech_data['service_area'],
                working_hours=tech_data['working_hours'],
                languages=tech_data['languages'],
                years_exp=tech_data['years_exp'],
                is_featured=tech_data['is_featured'],
            )
            session.add(tech)
            await session.flush()

            # Translations
            for locale, t in tech_data['translations'].items():
                translation = TechnicianTranslation(
                    technician_id=tech.id,
                    locale=locale,
                    bio=t['bio'],
                )
                session.add(translation)

            # Media (gallery photos)
            for photo_data in tech_data['photos']:
                media = Media(
                    technician_id=tech.id,
                    url=photo_data['url'],
                    caption=photo_data['caption'],
                    sort_order=photo_data['sort_order'],
                )
                session.add(media)

            # Services with numeric pricing
            for svc_slug, price_min, price_max in tech_data['services']:
                service = services_map[svc_slug]
                ts = TechnicianService(
                    technician_id=tech.id,
                    service_id=service.id,
                    estimated_price_min=price_min,
                    estimated_price_max=price_max,
                )
                session.add(ts)

            # Districts (many-to-many)
            for dist_slug in tech_data['districts']:
                district = districts_map[dist_slug]
                td = TechnicianDistrict(
                    technician_id=tech.id,
                    district_id=district.id,
                )
                session.add(td)

        await session.commit()
        print(
            f'Seed completed: {len(SERVICES_DATA)} services, '
            f'{len(TECHNICIANS_DATA)} technicians, '
            f'{len(DISTRICTS_DATA)} districts, '
            f'{len(SETTINGS_DATA)} settings'
        )

    await engine.dispose()


if __name__ == '__main__':
    asyncio.run(seed())
