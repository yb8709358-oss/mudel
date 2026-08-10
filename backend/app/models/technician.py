from sqlalchemy import (
    JSON,
    Boolean,
    Column,
    ForeignKey,
    Integer,
    Numeric,
    String,
    Text,
    UniqueConstraint,
    Uuid,
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import relationship

from app.models.base import Base, TimestampMixin, UUIDMixin

# JSONB on Postgres (production), plain JSON elsewhere (e.g. SQLite in tests).
JSONType = JSON().with_variant(JSONB, 'postgresql')


class Technician(Base, UUIDMixin, TimestampMixin):
    __tablename__ = 'technicians'

    name = Column(String(200), nullable=False)
    slug = Column(String(200), unique=True, nullable=False, index=True)
    phone = Column(String(20), nullable=False)
    whatsapp = Column(String(20), nullable=True)
    email = Column(String(200), nullable=True)
    photo_url = Column(String(500), nullable=True)
    rating = Column(Numeric(2, 1), default=5.0)
    review_count = Column(Integer, default=0)
    service_area = Column(String(300), nullable=True)
    working_hours = Column(JSONType, nullable=True)
    languages = Column(JSONType, nullable=True)
    years_exp = Column(Integer, nullable=True)
    is_featured = Column(Boolean, default=False)
    is_available = Column(Boolean, default=True)
    is_active = Column(Boolean, default=True)
    sort_order = Column(Integer, default=0)

    translations = relationship('TechnicianTranslation', back_populates='technician', cascade='all, delete-orphan')
    media = relationship('Media', back_populates='technician', cascade='all, delete-orphan')
    services = relationship('TechnicianService', back_populates='technician', cascade='all, delete-orphan')
    districts = relationship('District', secondary='technician_districts', back_populates='technicians')


class TechnicianTranslation(Base, UUIDMixin):
    __tablename__ = 'technician_translations'
    __table_args__ = (
        UniqueConstraint('technician_id', 'locale', name='uq_technician_translation'),
    )

    technician_id = Column(Uuid(as_uuid=True), ForeignKey('technicians.id', ondelete='CASCADE'), nullable=False)
    locale = Column(String(5), nullable=False)
    bio = Column(Text, nullable=True)

    technician = relationship('Technician', back_populates='translations')


class TechnicianService(Base, UUIDMixin):
    __tablename__ = 'technician_services'
    __table_args__ = (
        UniqueConstraint('technician_id', 'service_id', name='uq_technician_service'),
    )

    technician_id = Column(Uuid(as_uuid=True), ForeignKey('technicians.id', ondelete='CASCADE'), nullable=False)
    service_id = Column(Uuid(as_uuid=True), ForeignKey('services.id', ondelete='CASCADE'), nullable=False)
    estimated_price_min = Column(Numeric(10, 2), nullable=True)
    estimated_price_max = Column(Numeric(10, 2), nullable=True)

    technician = relationship('Technician', back_populates='services')
    service = relationship('Service')


class TechnicianDistrict(Base, UUIDMixin):
    __tablename__ = 'technician_districts'
    __table_args__ = (
        UniqueConstraint('technician_id', 'district_id', name='uq_technician_district'),
    )

    technician_id = Column(Uuid(as_uuid=True), ForeignKey('technicians.id', ondelete='CASCADE'), nullable=False)
    district_id = Column(Uuid(as_uuid=True), ForeignKey('districts.id', ondelete='CASCADE'), nullable=False)
