from datetime import datetime
from sqlmodel import Field, SQLModel, Relationship
from .engine import DB_ENGINE

# create all tables in the database
class Patient(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True, index=True)
    emu_id: str = Field(unique=True, index=True)
    latest: bool = Field(default=False)
    
    # Relationships
    interviews: list["Interview"] = Relationship(back_populates="patient")

class Interview(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True, index=True)
    patient_id: int = Field(foreign_key="patient.id", index=True)
    status: str
    survey_type: str
    catmh_id: int = Field(default=None)
    start_time: datetime
    end_time: datetime | None = Field(default=None)
    timeframe_id: int
    diagnosis: str | None = Field(default=None)
    confidence: float | None = Field(default=None)
    severity: float | None = Field(default=None)
    category: str | None = Field(default=None)
    precision: float | None = Field(default=None)
    prob: float | None = Field(default=None)
    percentile: float | None = Field(default=None)
    
    # Relationships
    patient: Patient = Relationship(back_populates="interviews")
    questions: list["Question"] = Relationship(back_populates="interview")

class Question(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True, index=True)
    interview_id: int = Field(foreign_key="interview.id", index=True)
    question_id: int
    display_duration: int  # Duration in milliseconds
    response_id: int
    response_weight: float
    response_text: str
    answer_list: str
    
    # Relationships
    interview: Interview = Relationship(back_populates="questions")

SQLModel.metadata.create_all(DB_ENGINE)


