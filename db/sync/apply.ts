import { interviewRepo } from "../repo/interviewRepo";
import { patientRepo } from "../repo/patientRepo";
import { Patient, SimpleInterview } from "../types";
import { fromIsoToDate, utcIsoNow } from "../util/time";

export async function applyUpsert(entity_type: string, payload: any) {
    if (entity_type === "Patient") {
        const p: Patient = {
            uuid: payload.uuid,
            emu_id: payload.emu_id,
            latest: !!payload.latest,
            updated_at_utc: payload.updated_at_utc ?? utcIsoNow(),
            deleted_at_utc: payload.deleted_at_utc ?? null,
        };
        await patientRepo.upsert(p);
        return;
    }

    if (entity_type === "SimpleInterview") {
        const i: SimpleInterview = {
            uuid: payload.uuid,
            patient_uuid: payload.patient_uuid,
            mood_rating: payload.mood_rating,
            energy_rating: payload.energy_rating,
            pain_rating: payload.pain_rating,
            task_name: payload.task_name,
            timestamp_start: fromIsoToDate(payload.timestamp_start),
            timestamp_save: fromIsoToDate(payload.timestamp_save),
            status: payload.status,
            updated_at_utc: payload.updated_at_utc ?? utcIsoNow(),
            deleted_at_utc: payload.deleted_at_utc ?? null,
        };
        await interviewRepo.upsert(i);
        return;
    }

    // ignore unknown types
}

export async function applyDelete(entity_type: string, entity_uuid: string, payload: any) {
    const deletedAt = payload?.deleted_at_utc ?? payload?.updated_at_utc ?? utcIsoNow();

    if (entity_type === "Patient") {
        await patientRepo.softDelete(entity_uuid, deletedAt);
        await interviewRepo.softDeleteByPatient(entity_uuid, deletedAt);
        return;
    }

    if (entity_type === "SimpleInterview") {
        const existing = await interviewRepo.getByUuid(entity_uuid);
        if (!existing) return;

        const sourcePatientUuid = payload?.patient_uuid ?? null;
        if (sourcePatientUuid && existing.patient_uuid !== sourcePatientUuid) {
            return;
        }

        await interviewRepo.softDelete(entity_uuid, deletedAt);
    }
}
