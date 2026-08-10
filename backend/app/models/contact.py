from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Index, String, Text, Uuid
from sqlalchemy.orm import relationship

from app.models.base import Base, TimestampMixin, UUIDMixin


class ContactMessage(Base, UUIDMixin, TimestampMixin):
    __tablename__ = 'contact_messages'
    __table_args__ = (
        Index('ix_contact_messages_created', 'created_at'),
    )

    name = Column(String(200), nullable=False)
    phone = Column(String(20), nullable=False)
    district = Column(String(100), nullable=False)
    email = Column(String(200), nullable=True)
    service_id = Column(Uuid(as_uuid=True), ForeignKey('services.id', ondelete='SET NULL'), nullable=True)
    message = Column(Text, nullable=True)
    is_read = Column(Boolean, default=False)

    request_token = Column(String(100), unique=True, nullable=True, index=True)
    request_token_expires_at = Column(DateTime(timezone=True), nullable=True)
    request_token_consumed_at = Column(DateTime(timezone=True), nullable=True)

    service = relationship('Service')

    # Read-only access to the request a customer completed after using the
    # token link. viewonly keeps SQLAlchemy from trying to manage the FK
    # (ServiceRequest.contact_message_id) through this side.
    service_request = relationship(
        'ServiceRequest',
        uselist=False,
        viewonly=True,
        foreign_keys='ServiceRequest.contact_message_id',
    )
