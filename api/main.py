from .db.engine import DB_ENGINE
from .db.models import *
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlmodel import Session, select
import os
import pandas as pd

app = FastAPI()

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
def dump_db():
    log_path = os.getenv("LOG_PATH")
    if log_path is None:
        raise ValueError("LOG_PATH is not set")
    # create dirs for all our patients if they don't exist
    statement = select(Patient)
    with Session(DB_ENGINE) as session:
        results = session.exec(statement)
        patient_dirs = [os.path.join(log_path, patient.emu_id) for patient in results]
        # create questiond dirs as well
        question_dirs = [os.path.join(patient_dir, "questions") for patient_dir in patient_dirs]
        os.makedirs(patient_dirs, exist_ok=True)
        os.makedirs(question_dirs, exist_ok=True)
        # now get all interviews for each patient and output to csv 
        for patient in results:
            statement = select(SimpleInterview).where(SimpleInterview.patient_id == patient.id)
            interview_results = session.exec(statement)
            interview_df = pd.DataFrame([interview.model_dump() for interview in interview_results])
            interview_df.to_csv(os.path.join(patient_dirs[patient.id], "vas_interview.csv"), index=False)
            

    return {"message": "NOT IMPLEMENTED"}

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
        interview.timestamp = interview_data.timestamp
        interview.mood_rating = interview_data.mood_rating
        interview.energy_rating = interview_data.energy_rating
        interview.pain_rating= interview_data.pain_rating
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
        from datetime import datetime
        import pytz
        if interview_data.get("timestamp"):
            try:
                # Parse ISO string and convert to US Central time
                timestamp_str = interview_data["timestamp"]
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
                timestamp = timestamp.replace(tzinfo=None)
            except ValueError:
                # If parsing fails, use current US Central time
                central_tz = pytz.timezone('US/Central')
                timestamp = datetime.now(central_tz).replace(tzinfo=None)
        else:
            # Use current US Central time
            central_tz = pytz.timezone('US/Central')
            timestamp = datetime.now(central_tz).replace(tzinfo=None)
        
        # Create SimpleInterview from the request data
        print(f"Creating interview with timestamp: {timestamp} (type: {type(timestamp)})")
        interview = SimpleInterview(
            patient_id=interview_data["patient_id"],
            mood_rating=interview_data["mood_rating"],
            energy_rating=interview_data["energy_rating"],
            pain_rating=interview_data["pain_rating"],
            timestamp=timestamp,
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