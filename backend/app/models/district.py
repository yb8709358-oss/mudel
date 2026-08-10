from sqlalchemy import Boolean, Column, ForeignKey, Integer, String, Text, UniqueConstraint, Uuid
from sqlalchemy.orm import relationship

from app.models.base import Base, TimestampMixin, UUIDMixin


class District(Base, UUIDMixin, TimestampMixin):
    __tablename__ = 'districts'

    slug = Column(String(100), unique=True, nullable=False, index=True)
    sort_order = Column(Integer, default=0)
    is_active = Column(Boolean, default=True)

    translations = relationship('DistrictTranslation', back_populates='district', cascade='all, delete-orphan')
    technicians = relationship('Technician', secondary='technician_districts', back_populates='districts')


class DistrictTranslation(Base, UUIDMixin):
    __tablename__ = 'district_translations'
    __table_args__ = (
        UniqueConstraint('district_id', 'locale', name='uq_district_translation'),
    )

    district_id = Column(Uuid(as_uuid=True), ForeignKey('districts.id', ondelete='CASCADE'), nullable=False)
    locale = Column(String(5), nullable=False)
    name = Column(String(200), nullable=False)
    description = Column(Text, nullable=True)

    district = relationship('District', back_populates='translations')
