from datetime import datetime
from sqlmodel import Field, SQLModel, Relationship
from .engine import DB_ENGINE

# SIMPLIFIED DATABASE MODELS FOR 2-SCALE RATING SYSTEM
class Patient(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True, index=True)
    emu_id: str = Field(unique=True, index=True)
    latest: bool = Field(default=False)
    
    # Relationships
    simple_interviews: list["SimpleInterview"] = Relationship(back_populates="patient")

class SimpleInterview(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True, index=True)
    patient_id: int = Field(foreign_key="patient.id", index=True)
    mood_rating: int = Field()  # 1-7 scale
    energy_rating: int = Field()  # 1-7 scale
    pain_rating: int = Field()  # 1-7 scale
    timestamp: datetime = Field(default_factory=datetime.now)
    status: str = Field(default="completed")  # completed, draft
    
    # Relationships
    patient: Patient = Relationship(back_populates="simple_interviews")

SQLModel.metadata.create_all(DB_ENGINE)


