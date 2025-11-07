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

# models for notification schedule
class PushRegistration(SQLModel, table=True):
    __tablename__ = "push_registration"

    id: int | None = Field(default=None, primary_key=True, index=True)
    expo_push_token: str
    timezone: str
    platform: str

    # Relationships
    notification_schedules: list["NotificationSchedule"] = Relationship(back_populates="push_registration")
    notification_logs: list["NotificationLog"] = Relationship(back_populates="push_registration")

class NotificationSchedule(SQLModel, table=True):
    __tablename__ = "notification_schedule"
    
    id: int | None = Field(default=None, primary_key=True, index=True)
    token_id: int = Field(foreign_key="push_registration.id", index=True)
    freq_minutes: int = Field(gt=0)
    duration_days: int = Field(gt=0)
    start_time_iso: datetime
    admin_timezone: str
    active: bool

    # Relationships
    push_registration: PushRegistration = Relationship(back_populates="notification_schedules")
    notification_logs: list["NotificationLog"] = Relationship(back_populates="notification_schedule")

class NotificationLog(SQLModel, table=True):
    __tablename__ = "notification_log"

    id: int | None = Field(default=None, primary_key=True, index=True)
    token_id: int = Field(foreign_key="push_registration.id", index=True)
    schedule_id: int = Field(foreign_key="notification_schedule.id", index=True)
    planned_at_utc: datetime
    sent_at_utc: datetime | None = Field(default=None)
    ticket_id: str | None = Field(default=None)
    status: str
    error: str | None = Field(default=None)

    # Relationships
    push_registration: PushRegistration = Relationship(back_populates="notification_logs")
    notification_schedule: NotificationSchedule = Relationship(back_populates="notification_logs")



   


SQLModel.metadata.create_all(DB_ENGINE)


