from .config import settings
from .db.engine import DB_ENGINE
from .db.models import *
from .db.payload import *
from .db.operations import *
from fastapi import FastAPI, Header, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlmodel import Session, select
import os
import pandas as pd
from datetime import datetime, timezone
from typing import Annotated

app = FastAPI()


def utc_iso(dt: datetime | None) -> str | None:
    if dt is None:
        return None

    if dt.tzinfo is None:
        return dt.replace(tzinfo=timezone.utc).isoformat(timespec="milliseconds").replace("+00:00", "Z")

    return dt.astimezone(timezone.utc).isoformat(timespec="milliseconds").replace("+00:00", "Z")


def serialize_patient(patient: Patient) -> dict:
    return {
        "id": patient.id,
        "uuid": patient.uuid,
        "emu_id": patient.emu_id,
        "latest": patient.latest,
        "updated_at_utc": utc_iso(patient.updated_at_utc),
        "deleted_at_utc": utc_iso(patient.deleted_at_utc),
    }


def serialize_interview(interview: SimpleInterview) -> dict:
    return {
        "id": interview.id,
        "uuid": interview.uuid,
        "patient_id": interview.patient_id,
        "patient_uuid": interview.patient_uuid,
        "mood_rating": interview.mood_rating,
        "energy_rating": interview.energy_rating,
        "pain_rating": interview.pain_rating,
        "task_name": interview.task_name,
        "timestamp_start": utc_iso(interview.timestamp_start),
        "timestamp_save": utc_iso(interview.timestamp_save),
        "status": interview.status,
        "updated_at_utc": utc_iso(interview.updated_at_utc),
        "deleted_at_utc": utc_iso(interview.deleted_at_utc),
    }

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:8081",  # Expo development server
        "http://localhost:3000",  # Alternative React Native port
        "http://127.0.0.1:8081",  # Alternative localhost
        "http://127.0.0.1:3000",  # Alternative localhost
        "exp://localhost:8081",   # Expo protocol
        "exp://127.0.0.1:8081",  # Expo protocol
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def read_root():
    return {"message": "App is live!"}

@app.get("/health")
def health_check():
    return {"status": "healthy", "message": "FastAPI is running"}

@app.post("/dump-db")
def dump_db(
    query_data: dict,
    x_dump_key: Annotated[str | None, Header()] = None,
    ):
    if "query_start" not in query_data or "query_end" not in query_data:
        raise HTTPException(status_code=422, detail="Request body does not contain required query params")
    
    # also raise 403 error if dump key not provided
    if not x_dump_key or x_dump_key != settings.dump_key:
        raise HTTPException(status_code=403, detail="dump key was not provided or was incorrect")
    
    # parse query data
    start_time = datetime.fromisoformat(query_data["query_start"])
    end_time = datetime.fromisoformat(query_data["query_end"])

    log_path = os.getenv("LOG_PATH")
    if log_path is None:
        raise HTTPException(status_code=500, detail="LOG_PATH is not set")
    
    # create dirs for all our patients if they don't exist
    statement = select(Patient).where(Patient.deleted_at_utc == None)
    created_filepaths = []
    with Session(DB_ENGINE) as session:
        results = session.exec(statement).all()
        # now get all interviews for each patient and output to csv 
        for patient in results:
            # get that patient's interviews
            interviews = session.exec(
                select(SimpleInterview).where(
                    SimpleInterview.timestamp_start >= start_time,
                    SimpleInterview.timestamp_start <= end_time,
                    SimpleInterview.patient_uuid == patient.uuid,
                    SimpleInterview.deleted_at_utc == None,
                    )
            ).all()

            if not interviews:
                # nothing to write for this patient, skip
                continue

            # build a directory per patient
            # make sure emu_id is a string & safe for paths
            patient_dir = os.path.join(log_path, str(patient.emu_id))
            os.makedirs(patient_dir, exist_ok=True)    

            interview_df = pd.DataFrame(
                [interview.model_dump() for interview in interviews]
            )

            csv_path = os.path.join(patient_dir, f"vas_interview_{query_data['query_start']}.csv")
            interview_df.to_csv(csv_path, index=False)
            created_filepaths.append(csv_path)

    return {"filepaths": created_filepaths}

@app.post("/sync/push", response_model=SyncPushResponse)
def sync_push(req: SyncPushRequest):
    results: list[SyncOpResult] = []

    with Session(DB_ENGINE) as session:
        for op in req.ops:
            # 1) idempotency gate
            statement = select(SyncOperation).where(SyncOperation.op_id == op.op_id)
            seen = session.exec(statement).first()
            if seen:
                results.append(SyncOpResult(op_id=op.op_id, status=seen.status, error=seen.error))
                continue

            # 2) apply + record atomically
            try:
                if op.op_type == "UPSERT":
                    if op.payload is None:
                        raise ValueError("UPSERT requires payload")
                
                # Apply domain mutation
                if op.op_type == "UPSERT":
                    if op.entity_type == "Patient":
                        upsert_patient(session, op.payload)
                    elif op.entity_type == "SimpleInterview":
                        upsert_simple_interview(session, op.payload)
                    else:
                        raise ValueError(f"Unsupported entity_type {op.entity_type}")
                elif op.op_type == "DELETE":
                    move_tombstone = (
                        op.entity_type == "SimpleInterview"
                        and op.payload is not None
                        and op.payload.get("moved_to_patient_uuid") is not None
                    )
                    if not move_tombstone:
                        soft_delete_entity(session, op.entity_type, op.entity_uuid)
                else:
                    raise ValueError(f"Unsupported op_type {op.op_type}")
                
                # Record op receipt
                receipt = SyncOperation(
                    op_id=op.op_id,
                    device_id=req.device_id,
                    status="ACK",
                    error=None,
                )
                session.add(receipt)

                # Appent to change feed (authoritative timeline)
                change = Change(
                    device_id=req.device_id,
                    op_id=op.op_id,
                    entity_type=op.entity_type,
                    entity_uuid=op.entity_uuid,
                    op_type=op.op_type,
                    scope_patient_uuid=op.scope_patient_uuid,
                    server_ts_utc=utcnow(),
                    payload_json=op.payload,
                )
                session.add(change)

                session.commit()
                res = SyncOpResult(op_id=op.op_id, status="ACK", error=None)
                results.append(res)
            except Exception as e:
                session.rollback()
                # Record rejection so retries get consistent answer
                receipt = SyncOperation(
                    op_id=op.op_id,
                    device_id=req.device_id,
                    status="REJECT",
                    error=str(e)
                )
                session.add(receipt)
                session.commit()
                res = SyncOpResult(op_id=op.op_id, status="REJECT", error=str(e))
                results.append(res)
        
        # return latest change cursor 
        statement = select(Change.change_id).order_by(Change.change_id.desc())
        latest = session.exec(statement).first()
        latest_change_id = int(latest) if latest is not None else 0
        
    return SyncPushResponse(results=results, latest_change_id=latest_change_id)


@app.get("/sync/pull", response_model=SyncPullResponse)
def sync_pull(patient_uuid: str, since_change_id: int = 0):
    with Session(DB_ENGINE) as session:
        statement = (
            select(Change)
            .where(Change.scope_patient_uuid == patient_uuid)
            .where(Change.change_id > since_change_id)
            .order_by(Change.change_id.asc())
        )
        rows = session.exec(statement).all()

        # also get latest change id in scope
        statement = select(Change.change_id).where(Change.scope_patient_uuid == patient_uuid).order_by(Change.change_id.desc())
        latest = session.exec(statement).first()
        latest_change_id = int(latest) if latest is not None else since_change_id

        # format for response
        changes_payload = []
        for r in rows:
            payload = {
                "change_id": r.change_id,
                "device_id": r.device_id,
                "op_id": r.op_id,
                "entity_type": r.entity_type,
                "entity_uuid": r.entity_uuid,
                "op_type": r.op_type,
                "scope_patient_uuid": r.scope_patient_uuid,
                "server_ts_utc": r.server_ts_utc,
                "payload": r.payload_json,
            }
            changes_payload.append(payload)
    return SyncPullResponse(latest_change_id=latest_change_id, changes=changes_payload)

@app.get("/patients/by-emu/{emu_id}")
def get_patient_uuid_by_emu(emu_id: str):
    with Session(DB_ENGINE) as session:
        statement = select(Patient).where(Patient.emu_id == emu_id)
        results = session.exec(statement)
        patient = results.first()
        if not patient:
            raise HTTPException(status_code=404, detail="Patient not found")
        
        statement = select(Change.change_id).where(Change.scope_patient_uuid == patient.uuid).order_by(Change.change_id.desc())
        latest = session.exec(statement).first()
        latest_change_id = int(latest) if latest is not None else 0
    return {"patient_uuid": patient.uuid, "latest_change_id": latest_change_id}

@app.get("/sync/bootstrap")
def sync_bootstrap(emu_id: str):
    with Session(DB_ENGINE) as session:
        statement = (
            select(Patient)
            .where(Patient.emu_id == emu_id)
            .where(Patient.deleted_at_utc == None)
        )
        patient = session.exec(statement).first()
        if not patient:
            raise HTTPException(status_code=404, detail="Patient not found")
        
        statement = select(Change.change_id).where(Change.scope_patient_uuid == patient.uuid).order_by(Change.change_id.desc())
        latest = session.exec(statement).first()
        latest_change_id = int(latest) if latest is not None else 0

        # include the full active interview set so local DB can be fully rehydrated
        interviews = session.exec(
            select(SimpleInterview)
            .where(SimpleInterview.patient_uuid == patient.uuid)
            .where(SimpleInterview.deleted_at_utc == None)
            .order_by(SimpleInterview.timestamp_start.desc())
        ).all()

        return {
            "patient": serialize_patient(patient),
            "latest_change_id": latest_change_id,
            "interviews": [serialize_interview(i) for i in interviews],
        }
