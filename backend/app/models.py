from datetime import datetime
from sqlalchemy import Column, Integer, String, Boolean, DateTime, Text
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker, declarative_base
from app.config import DATABASE_URL

engine = create_async_engine(DATABASE_URL, echo=False)
AsyncSessionLocal = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
Base = declarative_base()


class SavedTemplate(Base):
    __tablename__ = "saved_templates"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(200), nullable=False)
    store_name = Column(String(200), nullable=True)
    image_path = Column(String(500), nullable=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)


class GenerationJob(Base):
    __tablename__ = "generation_jobs"

    id = Column(Integer, primary_key=True, index=True)
    store_name = Column(String(200), nullable=False)
    template_path = Column(String(500), nullable=False)
    is_one_time = Column(Boolean, default=True)
    rotor_part = Column(String(100), nullable=True)
    pad_part = Column(String(100), nullable=True)
    rotor_image_path = Column(String(500), nullable=True)
    pad_image_path = Column(String(500), nullable=True)
    final_image_path = Column(String(500), nullable=True)
    status = Column(String(50), default="pending")  # pending | processing | completed | failed
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)


async def init_db():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
