from .db.engine import DB_ENGINE
from .db.models import *
from fastapi import FastAPI
from sqlmodel import Session, select
import os
import pandas as pd

app = FastAPI()

@app.get("/")
def read_root():
    return {"message": "App is live!"}

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
            statement = select(Interview).where(Interview.patient_id == patient.id)
            interview_results = session.exec(statement)
            interview_df = pd.DataFrame([interview.model_dump() for interview in interview_results])
            interview_df.to_csv(os.path.join(patient_dirs[patient.id], "interviews.csv"), index=False)
            # now get all questions for each interview and output to csv
            for interview in interview_results:
                statement = select(Question).where(Question.interview_id == interview.id)
                question_results = session.exec(statement)
                question_df = pd.DataFrame([question.model_dump() for question in question_results])
                question_df.to_csv(os.path.join(patient_dirs[patient.id], f"questions/{interview.id}_questions.csv"), index=False)

    return {"message": "NOT IMPLEMENTED"}

@app.get("/patients")
def get_patients() -> list[Patient]:
    statement = select(Patient)
    with Session(DB_ENGINE) as session:
        results = session.exec(statement)
        return results

@app.post("/patient-add")
def add_patient(patient: Patient):
    with Session(DB_ENGINE) as session:
        session.add(patient)
        session.commit()
    return {"message": "Patient added successfully"}

@app.post("/patient-update")
def update_patients(patient_list: list[Patient]):
    with Session(DB_ENGINE) as session:
        for patient_data in patient_list:
            statement = select(Patient).where(Patient.id == patient_data.id)
            results = session.exec(statement)
            patient = results.one()
            patient.emu_id = patient_data.emu_id
            patient.latest = patient_data.lastest
            session.add(patient)
        session.commit()
    return {"message": "Patients updated successfully"}


@app.get("/interviews/{patient_id}")
def get_interviews(patient_id: int) -> list[Interview]:
    # get all interviews for this patient
    statement = select(Interview).where(Interview.patient_id == patient_id)
    with Session(DB_ENGINE) as session:
        results = session.exec(statement)
    return results

@app.post("/interview-add")
def add_interview(interview: Interview):
    with Session(DB_ENGINE) as session:
        session.add(interview)
        session.commit()
    return {"message": "Interview added successfully"}
 
@app.post("/interview-update")
def update_interview(interview_data: Interview):
    with Session(DB_ENGINE) as session:
        statement = select(Interview).where(Interview.id == interview_data.id)
        results = session.exec(statement)
        interview = results.one()
        interview.status = interview_data.status
        interview.end_time = interview_data.end_time
        interview.diagnosis = interview_data.diagnosis
        interview.confidence = interview_data.confidence
        interview.severity = interview_data.severity
        interview.category = interview_data.category
        interview.precision = interview_data.precision
        interview.prob = interview_data.prob
        interview.percentile = interview_data.percentile
        session.add(interview)
        session.commit()
    return {"message": "Interview updated successfully"}