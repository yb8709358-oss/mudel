from sqlalchemy import JSON, Column, Date, Float, ForeignKey, Index, String, Text, Uuid
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import relationship

from app.models.base import Base, TimestampMixin, UUIDMixin

# JSONB on Postgres (production), plain JSON elsewhere (e.g. SQLite in tests).
JSONType = JSON().with_variant(JSONB, 'postgresql')


class ServiceRequest(Base, UUIDMixin, TimestampMixin):
    __tablename__ = 'service_requests'
    __table_args__ = (
        Index('ix_service_requests_service_id', 'service_id'),
        Index('ix_service_requests_created', 'created_at'),
        Index('ix_service_requests_status', 'status'),
    )

    customer_name = Column(String(200), nullable=False)
    customer_phone = Column(String(20), nullable=False)
    customer_email = Column(String(200), nullable=True)
    service_id = Column(Uuid(as_uuid=True), ForeignKey('services.id', ondelete='CASCADE'), nullable=False)
    technician_id = Column(Uuid(as_uuid=True), ForeignKey('technicians.id', ondelete='SET NULL'), nullable=True)
    district_id = Column(Uuid(as_uuid=True), ForeignKey('districts.id', ondelete='SET NULL'), nullable=True)
    preferred_date = Column(Date, nullable=True)
    preferred_time = Column(String(50), nullable=True)
    description = Column(Text, nullable=True)
    status = Column(String(20), nullable=False, default='pending')
    admin_notes = Column(Text, nullable=True)

    request_number = Column(String(30), unique=True, nullable=True, index=True)
    contact_message_id = Column(
        Uuid(as_uuid=True),
        ForeignKey('contact_messages.id'),
        nullable=True,
        index=True,
    )
    address = Column(Text, nullable=True)
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)
    attachments = Column(JSONType, nullable=True)

    service = relationship('Service')
    technician = relationship('Technician')
    district = relationship('District')
    contact = relationship('ContactMessage')
