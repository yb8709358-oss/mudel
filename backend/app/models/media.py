from sqlalchemy import CheckConstraint, Column, ForeignKey, Integer, String, Uuid
from sqlalchemy.orm import relationship

from app.models.base import Base, TimestampMixin, UUIDMixin


class Media(Base, UUIDMixin, TimestampMixin):
    __tablename__ = 'media'
    __table_args__ = (
        CheckConstraint(
            'technician_id IS NOT NULL OR service_id IS NOT NULL',
            name='media_owner_check',
        ),
    )

    technician_id = Column(Uuid(as_uuid=True), ForeignKey('technicians.id', ondelete='CASCADE'), nullable=True)
    service_id = Column(Uuid(as_uuid=True), ForeignKey('services.id', ondelete='CASCADE'), nullable=True)
    url = Column(String(500), nullable=False)
    caption = Column(String(200), nullable=True)
    alt_text = Column(String(200), nullable=True)
    media_type = Column(String(20), nullable=False, default='image')
    sort_order = Column(Integer, default=0)

    technician = relationship('Technician', back_populates='media')
    service = relationship('Service', back_populates='media',
                           primaryjoin="Media.service_id == Service.id")
