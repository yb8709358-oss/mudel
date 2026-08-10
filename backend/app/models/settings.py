from sqlalchemy import Column, String, Text

from app.models.base import Base, TimestampMixin


class Setting(Base, TimestampMixin):
    __tablename__ = 'settings'

    key = Column(String(100), primary_key=True)
    value = Column(Text, nullable=False)
