from sqlmodel import Session, select
from fastapi import HTTPException
from datetime import datetime, timezone
from .models import Patient, SimpleInterview

def utcnow():
    return datetime.now(timezone.utc)

def upsert_patient(session: Session, payload: dict) -> Patient:
    # payload must contain uuid, emu_id
    p_uuid = payload.get("uuid")
    emu_id = payload.get("emu_id")
    if not p_uuid or not emu_id:
        raise ValueError("Patient UPSERT requires 'uuid' and 'emu_id'")

    statement = select(Patient).where(Patient.uuid == p_uuid)
    existing = session.exec(statement).first()
    if existing:
        # update allowed fields
        existing.emu_id = emu_id
        existing.latest = bool(payload.get("latest", existing.latest))
        existing.deleted_at_utc = payload.get("deleted_at_utc", existing.deleted_at_utc)
        existing.updated_at_utc = utcnow()
        session.add(existing)
        return existing
    else:
        # Create
        p = Patient(
            uuid=p_uuid,
            emu_id=emu_id,
            latest=bool(payload.get("latest", False)),
            updated_at_utc=utcnow(),
            deleted_at_utc=None,
        )
        session.add(p)
        return p

def upsert_simple_interview(session: Session, payload: dict) -> SimpleInterview:
    i_uuid = payload.get("uuid")
    patient_uuid = payload.get("patient_uuid")
    if not i_uuid or not patient_uuid:
        raise ValueError("SimpleInterview UPSERT requires 'uuid' and 'patient_uuid'")

    # Resolve patient_id from patient_uuid
    statement = select(Patient).where(Patient.uuid == patient_uuid)
    patient = session.exec(statement).first()
    if not patient:
        raise ValueError(f"Unknown patient_uuid {patient_uuid} (patient must be pushed first)")

    statement = select(SimpleInterview).where(SimpleInterview.uuid == i_uuid)
    existing = session.exec(statement).first()
    if existing:
        existing.patient_uuid = patient_uuid
        existing.patient_id = patient.id
        existing.mood_rating = int(payload["mood_rating"])
        existing.energy_rating = int(payload["energy_rating"])
        existing.pain_rating = int(payload["pain_rating"])
        existing.task_name = str(payload["task_name"])
        existing.status = str(payload.get("status", existing.status))

        # format timestamp payloads
        timestamp_start = payload["timestamp_start"]
        timestamp_start = timestamp_start if not isinstance(timestamp_start, str) else datetime.fromisoformat(timestamp_start)

        timestamp_save = payload.get("timestamp_save", utcnow())
        timestamp_save = timestamp_save if not isinstance(timestamp_save, str) else datetime.fromisoformat(timestamp_save)

        existing.timestamp_start = timestamp_start
        existing.timestamp_save = timestamp_save
        existing.deleted_at_utc = payload.get("deleted_at_utc", existing.deleted_at_utc)
        existing.updated_at_utc = utcnow()
        session.add(existing)
        return existing
    else:
        # format timestamp payloads
        timestamp_start = payload["timestamp_start"]
        timestamp_start = timestamp_start if not isinstance(timestamp_start, str) else datetime.fromisoformat(timestamp_start)

        timestamp_save = payload.get("timestamp_save", utcnow())
        timestamp_save = timestamp_save if not isinstance(timestamp_save, str) else datetime.fromisoformat(timestamp_save)

        i = SimpleInterview(
            uuid=i_uuid,
            patient_uuid=patient_uuid,
            patient_id=patient.id,
            mood_rating=int(payload["mood_rating"]),
            energy_rating=int(payload["energy_rating"]),
            pain_rating=int(payload["pain_rating"]),
            task_name=str(payload["task_name"]),
            timestamp_start=timestamp_start,
            timestamp_save=timestamp_save,
            status=str(payload.get("status", "completed")),
            updated_at_utc=utcnow(),
            deleted_at_utc=None,
        )
        session.add(i)
        return i

def soft_delete_entity(session: Session, entity_type: str, entity_uuid: str):
    if entity_type == "Patient":
        statement = select(Patient).where(Patient.uuid == entity_uuid)
        obj = session.exec(statement).first()
        if not obj:
            return
        obj.deleted_at_utc = utcnow()
        obj.updated_at_utc = utcnow()
        session.add(obj)

    elif entity_type == "SimpleInterview":
        statement = select(SimpleInterview).where(SimpleInterview.uuid == entity_uuid)
        obj = session.exec(statement).first()
        if not obj:
            return
        obj.deleted_at_utc = utcnow()
        obj.updated_at_utc = utcnow()
        session.add(obj)
    else:
        raise ValueError(f"Unknown entity_type {entity_type}")