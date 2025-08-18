from datetime import datetime, timedelta
from sqlmodel import Field, SQLModel
from .engine import DB_ENGINE

# create all tables in the database
class Patient(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    emu_id: str
    latest: bool = Field(default=False)

class Interview(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    patient_id: int = Field(default=None, foreign_key="patient.id")
    status: str
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




class Question(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    interview_id: int = Field(default=None, foreign_key="interview.id")
    question_id: int
    display_duration: timedelta
    response_id: int
    response_weight: float
    response_text: str
    answer_list: str



SQLModel.metadata.create_all(DB_ENGINE)


