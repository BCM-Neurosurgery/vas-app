import { getAllAsync, runAsync } from '../sqlite';
import { SimpleInterview } from '../types';
import { fromIsoToDate, toUtcIso, utcIsoNow } from '../util/time';

export const interviewRepo = {
    async listByPatient(patient_uuid: string): Promise<SimpleInterview[]> {
        const rows = await getAllAsync<any>(
            `SELECT * 
             FROM simple_interviews
             WHERE patient_uuid = ?
                AND deleted_at_utc IS NULL
             ORDER BY timestamp_start_utc DESC`,
            [patient_uuid]
        );

        return rows.map((r: any) => ({
            uuid: r.uuid,
            patient_uuid: r.patient_uuid,
            mood_rating: r.mood_rating,
            energy_rating: r.energy_rating,
            pain_rating: r.pain_rating,
            task_name: r.task_name,
            timestamp_start: fromIsoToDate(r.timestamp_start_utc),
            timestamp_save: fromIsoToDate(r.timestamp_save_utc),
            status: r.status,
            updated_at_utc: r.updated_at_utc,
            deleted_at_utc: r.deleted_at_utc ?? null,
        }));
    },

    async upsert(i: SimpleInterview): Promise<void> {
        await runAsync(
            `INSERT INTO simple_interviews (
                uuid, patient_uuid, mood_rating, energy_rating, pain_rating, task_name,
                timestamp_start_utc, timestamp_save_utc, status, updated_at_utc, deleted_at_utc
             ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
             ON CONFLICT(uuid) DO UPDATE SET
                patient_uuid=excluded.patient_uuid,
                mood_rating=excluded.mood_rating,
                energy_rating=excluded.energy_rating,
                pain_rating=eccluded.pain_rating,
                task_name=excluded.task_name,
                timestamp_start_utc=excluded.timestamp_start_utc,
                timestamp_save_utc=excluded.timestamp_save_utc,
                status=excluded.status,
                updated_at_utc=excluded.updated_at_utc,
                deleted_at_utc=excluded.deleted_at_utc`,
            [
                i.uuid,
                i.patient_uuid,
                i.mood_rating,
                i.energy_rating,
                i.pain_rating,
                i.task_name,
                toUtcIso(i.timestamp_start),
                toUtcIso(i.timestamp_save),
                i.status,
                i.updated_at_utc ?? utcIsoNow(),
                i.deleted_at_utc ?? null,
            ]
        );
    },
};