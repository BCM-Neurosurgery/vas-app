from .config import settings
from .db.engine import DB_ENGINE
from .db.models import *
from .db.payload import *
from .db.operations import *
from .db.jobs import send_due_notifications, check_expo_receipts
from fastapi import FastAPI, Header, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlmodel import Session, select
import os
from contextlib import asynccontextmanager
import pandas as pd
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from datetime import datetime, timedelta
from typing import Annotated
import pytz

scheduler = AsyncIOScheduler()

@asynccontextmanager
async def lifespan(app: FastAPI):
    # add job to scheduler and start it
    scheduler.add_job(send_due_notifications, "cron", second="0")
    scheduler.add_job(check_expo_receipts, "cron", minute="*/5")
    scheduler.start()
    yield
    # shut down scheduler
    scheduler.shutdown(wait=False)

app = FastAPI(lifespan=lifespan)

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
    statement = select(Patient)
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
                    SimpleInterview.patient_id == patient.id,
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

@app.get("/patients")
def get_patients() -> list[Patient]:
    try:
        statement = select(Patient)
        with Session(DB_ENGINE) as session:
            results = session.exec(statement)
            patients = list(results)
            return patients
    except Exception as e:
        print(f"Error fetching patients: {e}")
        return []

@app.get("/patients/{emu_id}")
def get_patient_by_emu_id(emu_id: str) -> Patient | None:
    try:
        statement = select(Patient).where(Patient.emu_id == emu_id)
        with Session(DB_ENGINE) as session:
            result = session.exec(statement).first()
            return result
    except Exception as e:
        print(f"Error fetching patient by emu_id {emu_id}: {e}")
        return None

@app.post("/patient-add")
def add_patient(patient: Patient) -> Patient:
    with Session(DB_ENGINE) as session:
        session.add(patient)
        session.commit()
        session.refresh(patient)
    return patient

@app.post("/patient-update")
def update_patients(patient_list: list[Patient]):
    with Session(DB_ENGINE) as session:
        for patient_data in patient_list:
            statement = select(Patient).where(Patient.id == patient_data.id)
            results = session.exec(statement)
            patient = results.one()
            patient.emu_id = patient_data.emu_id
            patient.latest = patient_data.latest
            session.add(patient)
        session.commit()
    return {"message": "Patients updated successfully"}


@app.get("/interviews/{patient_id}")
def get_interviews(patient_id: int) -> list[SimpleInterview]:
    try:
        # get all interviews for this patient by patient_id
        statement = select(SimpleInterview).where(SimpleInterview.patient_id == patient_id)
        with Session(DB_ENGINE) as session:
            results = session.exec(statement)
            interviews = list(results)
            return interviews
    except Exception as e:
        print(f"Error fetching interviews for patient {patient_id}: {e}")
        return []

@app.post("/interview-add")
def add_interview(interview: SimpleInterview):
    with Session(DB_ENGINE) as session:
        session.add(interview)
        session.commit()
        session.refresh(interview)
    return interview
 
@app.post("/interview-update")
def update_interview(interview_data: SimpleInterview) -> SimpleInterview:
    with Session(DB_ENGINE) as session:
        
        statement = select(SimpleInterview).where(SimpleInterview.id == interview_data.id)
        results = session.exec(statement)
        interview = results.one()
        interview.status = interview_data.status
        interview.timestamp_start = interview_data.timestamp_start
        interview.timestamp_save = interview_data.timestamp_save
        interview.mood_rating = interview_data.mood_rating
        interview.energy_rating = interview_data.energy_rating
        interview.pain_rating = interview_data.pain_rating
        session.add(interview)
        session.commit()
    return interview

# Simple interviews endpoints (for the 2-scale rating system)
@app.get("/simple-interviews/{patient_id}")
def get_simple_interviews(patient_id: int) -> list[SimpleInterview]:
    try:
        statement = select(SimpleInterview).where(SimpleInterview.patient_id == patient_id)
        with Session(DB_ENGINE) as session:
            results = session.exec(statement)
            interviews = list(results)
            return interviews
    except Exception as e:
        print(f"Error fetching simple interviews for patient {patient_id}: {e}")
        return []

@app.post("/simple-interviews")
def create_simple_interview(interview_data: dict) -> SimpleInterview:
    try:
        # Parse timestamp if provided, otherwise use current time
        if interview_data.get("timestamp_save"):
            try:
                # Parse ISO string and convert to US Central time
                timestamp_str = interview_data["timestamp_save"]
                if timestamp_str.endswith('Z'):
                    timestamp_str = timestamp_str[:-1]  # Remove Z suffix
                timestamp = datetime.fromisoformat(timestamp_str)
                
                # Convert to US Central time
                if timestamp.tzinfo is not None:
                    # If timezone-aware, convert to US Central
                    central_tz = pytz.timezone('US/Central')
                    timestamp = timestamp.astimezone(central_tz)
                else:
                    # If naive, assume UTC and convert to US Central
                    utc_tz = pytz.timezone('UTC')
                    central_tz = pytz.timezone('US/Central')
                    timestamp = utc_tz.localize(timestamp).astimezone(central_tz)
                
                # Convert to naive datetime for MySQL
                timestamp_save = timestamp.replace(tzinfo=None)
            except ValueError:
                # If parsing fails, use current US Central time
                central_tz = pytz.timezone('US/Central')
                timestamp_save = datetime.now(central_tz).replace(tzinfo=None)
        else:
            # Use current US Central time
            central_tz = pytz.timezone('US/Central')
            timestamp_save = datetime.now(central_tz).replace(tzinfo=None)
        if interview_data.get("timestamp_start"):
            try:
                # Parse ISO string and convert to US Central time
                timestamp_str = interview_data["timestamp_start"]
                if timestamp_str.endswith('Z'):
                    timestamp_str = timestamp_str[:-1]  # Remove Z suffix
                timestamp = datetime.fromisoformat(timestamp_str)
                
                # Convert to US Central time
                if timestamp.tzinfo is not None:
                    # If timezone-aware, convert to US Central
                    central_tz = pytz.timezone('US/Central')
                    timestamp = timestamp.astimezone(central_tz)
                else:
                    # If naive, assume UTC and convert to US Central
                    utc_tz = pytz.timezone('UTC')
                    central_tz = pytz.timezone('US/Central')
                    timestamp = utc_tz.localize(timestamp).astimezone(central_tz)
                
                # Convert to naive datetime for MySQL
                timestamp_start = timestamp.replace(tzinfo=None)
            except ValueError:
                # If parsing fails, use current US Central time
                central_tz = pytz.timezone('US/Central')
                timestamp_start = datetime.now(central_tz).replace(tzinfo=None)
        else:
            # Use current US Central time
            central_tz = pytz.timezone('US/Central')
            timestamp_start = datetime.now(central_tz).replace(tzinfo=None)
        
        # Create SimpleInterview from the request data
        print(f"Creating interview with timestamp: {timestamp} (type: {type(timestamp)})")
        interview = SimpleInterview(
            patient_id=interview_data["patient_id"],
            mood_rating=interview_data["mood_rating"],
            energy_rating=interview_data["energy_rating"],
            pain_rating=interview_data["pain_rating"],
            task_name=interview_data["task_name"],
            timestamp_start=timestamp_start,
            timestamp_save=timestamp_save,
            status=interview_data.get("status", "completed")
        )
        
        with Session(DB_ENGINE) as session:
            session.add(interview)
            session.commit()
            session.refresh(interview)
        return interview
    except Exception as e:
        print(f"Error creating simple interview: {e}")
        raise e

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
                if op.entity_type == "Patient":
                    upsert_patient(session, op.payload)
                elif op.entity_type == "SimpleInterview":
                    upsert_simple_interview(session, op.payload)
                else:
                    raise ValueError(f"Unsupported entity_type {op.entity_type}")
                
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
                    payload_json=op.payload if op.op_type == "UPSERT" else None
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
    return SyncPullResponse(latest_change_id=latest, changes=changes_payload)

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
        statement = select(Patient).where(Patient.emu_id == emu_id)
        patient = session.exec(statement)
        if not patient:
            raise HTTPException(status_code=404, detail="Patient not found")
        
        statement = select(Change.change_id).where(Change.scope_patient_uuid == patient.uuid).order_by(Change.change_id.desc())
        latest = session.exec(statement)
        latest_change_id = int(latest) if latest is not None else 0

        # include small snapshot of recent interviews for fast UI
        interviews = (
            select(SimpleInterview)
            .where(SimpleInterview.patient_uuid == patient.uuid)
            .where(SimpleInterview.deleted_at_utc == None)
            .order_by(SimpleInterview.timestamp_start.desc())
            .limit(50)
        ).all()

        return {
            "patient": patient.model_dump(),
            "latest_change_id": latest_change_id,
            "recent_interviews": [i.model_dump for i in interviews],
        }

@app.post("/push/register")
def add_push_registration(registration: PushRegistration) -> PushRegistration:
    with Session(DB_ENGINE) as session:
        session.add(registration)
        session.commit()
        session.refresh(registration)
    return registration

@app.get("/push/{token}")
def get_push_registration(token: str):
    try:
        statement = select(PushRegistration).where(PushRegistration.expo_push_token == token)
        with Session(DB_ENGINE) as session:
            result = session.exec(statement).first()
            return result
    except Exception as e:
        print(f"Unable to fetch token registration {token}: {e}")
        return None

@app.post("/admin/schedule/create")
def create_schedule(schedule_data: dict) -> NotificationSchedule:
    try:
        # get token id from token string 
        token_str = schedule_data["expo_push_token"]
        statement = select(PushRegistration).where(PushRegistration.expo_push_token == token_str)
        with Session(DB_ENGINE) as session:
            result = session.exec(statement).first()
            token_id = result.id

        # create schedule item
        start_time_iso = datetime.fromisoformat(schedule_data["start_time_iso"])
        schedule = NotificationSchedule(
            token_id=token_id,
            freq_minutes=schedule_data["freq_minutes"],
            duration_days=schedule_data["duration_days"],
            start_time_iso=start_time_iso,
            admin_timezone=schedule_data["admin_timezone"],
            active=True,
        )

        # post to db
        with Session(DB_ENGINE) as session:
            session.add(schedule)
            session.commit()
            session.refresh(schedule)

        # create notification logs as needed
        t = start_time_iso
        end_time_iso = start_time_iso + timedelta(days=schedule_data["duration_days"])
        step = timedelta(minutes=schedule_data["freq_minutes"])
        logs = []
        while t < end_time_iso:
            logs.append(NotificationLog(
                token_id=token_id,
                schedule_id=schedule.id,
                planned_at_utc=t,
                status="pending"
            ))
            t += step

        # commit all notification logs
        with Session(DB_ENGINE) as session:
            session.add_all(logs)
            session.commit()
        return schedule
    except Exception as e:
        print(f"Error creating notification schedule: {e}")
        raise e
    

@app.get("/admin/schedule/get")
def get_schedule() -> NotificationSchedule | None:
    # get current active schedule if it exists
    statement = select(NotificationSchedule).where(NotificationSchedule.active == True)
    with Session(DB_ENGINE) as session:
        result = session.exec(statement).first()
        return result

@app.post("/admin/schedule/cancel")
def cancel_schedule() -> NotificationSchedule | None:
    # find currently active schedule
    statement = select(NotificationSchedule).where(NotificationSchedule.active == True)
    with Session(DB_ENGINE) as session:
        schedule = session.exec(statement).first()
        # if there is an active result, flip flag and commit
        if schedule:
            schedule.active = False
            session.add(schedule)
            session.commit()

            # also cancel all associated pending notification logs
            statement = select(NotificationLog).where(NotificationLog.schedule_id == schedule.id)
            results = session.exec(statement).all()
            if results:
                for result in results:
                    session.delete(result)
                    session.commit()

    return schedule


    
