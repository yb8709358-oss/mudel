from sqlalchemy import Boolean, Column, ForeignKey, Index, Integer, String, Text, UniqueConstraint, Uuid
from sqlalchemy.orm import relationship

from app.models.base import Base, TimestampMixin, UUIDMixin


class Service(Base, UUIDMixin, TimestampMixin):
    __tablename__ = 'services'

    slug = Column(String(100), unique=True, nullable=False, index=True)
    icon = Column(String(50), nullable=False, default='wrench')
    sort_order = Column(Integer, default=0)
    is_active = Column(Boolean, default=True)

    translations = relationship('ServiceTranslation', back_populates='service', cascade='all, delete-orphan')
    media = relationship('Media', back_populates='service', cascade='all, delete-orphan')


class ServiceTranslation(Base, UUIDMixin):
    __tablename__ = 'service_translations'
    __table_args__ = (
        UniqueConstraint('service_id', 'locale', name='uq_service_translation'),
        Index('ix_service_translations_locale', 'locale'),
    )

    service_id = Column(Uuid(as_uuid=True), ForeignKey('services.id', ondelete='CASCADE'), nullable=False)
    locale = Column(String(5), nullable=False)
    name = Column(String(200), nullable=False)
    description = Column(Text, nullable=True)
    meta_title = Column(String(70), nullable=True)
    meta_desc = Column(String(160), nullable=True)

    service = relationship('Service', back_populates='translations')
