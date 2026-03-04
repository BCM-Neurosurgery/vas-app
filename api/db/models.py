import uuid
from datetime import datetime, timezone
from sqlmodel import Field, SQLModel, Relationship, Index
from typing import Literal, Any
from .engine import DB_ENGINE

def utcnow():
    return datetime.now(timezone.utc)

# SIMPLIFIED DATABASE MODELS FOR 2-SCALE RATING SYSTEM
class Patient(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True, index=True)
    uuid: str = Field(default_factory=lambda: str(uuid.uuid4()), unique=True, index=True)

    emu_id: str = Field(unique=True, index=True)
    latest: bool = Field(default=False)

    updated_at_utc: datetime = Field(default_factory=utcnow, index=True)
    deleted_at_utc: datetime | None = Field(default=None, index=True)
    
    # Relationships
    simple_interviews: list["SimpleInterview"] = Relationship(back_populates="patient")

class SimpleInterview(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True, index=True)
    uuid: str = Field(default_factory=lambda: str(uuid.uuid4()), unique=True, index=True)

    patient_id: int = Field(foreign_key="patient.id", index=True)
    patient_uuid: str = Field(index=True) 

    mood_rating: int = Field()  # 1-7 scale
    energy_rating: int = Field()  # 1-7 scale
    pain_rating: int = Field()  # 1-7 scale
    task_name: str = Field()

    timestamp_start: datetime
    timestamp_save: datetime = Field(default_factory=utcnow)

    status: str = Field(default="completed")  # completed, draft

    updated_at_utc: datetime = Field(default_factory=utcnow, index=True)
    deleted_at_utc: datetime | None = Field(default=None, index=True)
    
    # Relationships
    patient: Patient = Relationship(back_populates="simple_interviews")

# models for syncrhonization

OpType = Literal["UPSERT", "DELETE"]
OpStatus = Literal["ACK", "REJECT"]

class SyncOperation(SQLModel, table=True):
    __tablename__ = "sync_operation"
    op_id: str = Field(primary_key=True, index=True)   # UUID from device
    device_id: str = Field(index=True)

    received_at_utc: datetime = Field(default_factory=utcnow, index=True)
    status: OpStatus = Field(index=True)
    error: str | None = Field(default=None)

class Change(SQLModel, table=True):
    __tablename__ = "change"
    change_id: int | None = Field(default=None, primary_key=True, index=True)

    device_id: str = Field(index=True)
    op_id: str = Field(index=True)  # can be a FK to sync_operation.op_id if you want

    entity_type: Literal["Patient", "SimpleInterview"] = Field(index=True)
    entity_uuid: str = Field(index=True)
    op_type: OpType = Field(index=True)

    scope_patient_uuid: str = Field(index=True)
    server_ts_utc: datetime = Field(default_factory=utcnow, index=True)

    __table_args__ = (
        Index('idx_change_scope_cursor', 'scope_patient_uuid', 'change_id'),
    )

    payload_json: dict | None = Field(default=None)  # json string


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


