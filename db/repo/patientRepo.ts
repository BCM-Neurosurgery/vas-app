import { getAllAsync, getFirstAsync, runAsync } from '../sqlite';
import { Patient } from '../types';
import { utcIsoNow } from '../util/time';

export const patientRepo = {
    async list(): Promise<Patient[]> {
        const rows = await getAllAsync<any>(
            `SELECT uuid, emu_id, latest, updated_at_utc, deleted_at_utc
             FROM patients
             WHERE deleted_at_utc IS NULL
             ORDER BY latest DESC, emu_id ASC`
        );
        return rows.map((r: any) => ({
            uuid: r.uuid,
            emu_id: r.emu_id,
            latest: !!r.latest,
            updated_at_utc: r.updated_at_utc,
            deleted_at_utc: r.deleted_at_utc ?? null,
        }));
    },

    async getByEmuId(emu_id: string): Promise<Patient | null> {
        const r = await getFirstAsync<any>(
            `SELECT uuid, emu_id, latest, updated_at_utc, deleted_at_utc
             FROM patients
             WHERE emu_id = ?`,
             [emu_id]
        );
        if (!r) return null;
        return {
            uuid: r.uuid,
            emu_id: r.emu_id,
            latest: !!r.latest,
            updated_at_utc: r.updated_at_utc,
            deleted_at_utc: r.deleted_at_utc ?? null,
        }
    },

    async getByUuid(uuid: string): Promise<Patient | null> {
        const r = await getFirstAsync<any>(
            `SELECT uuid, emu_id, latest, updated_at_utc, deleted_at_utc
             FROM patients
             WHERE uuid = ?`,
             [uuid]
        );
        if (!r) return null;
        return {
            uuid: r.uuid,
            emu_id: r.emu_id,
            latest: !!r.latest,
            updated_at_utc: r.updated_at_utc,
            deleted_at_utc: r.deleted_at_utc ?? null,
        };
    },

    async upsert(p: Patient): Promise<void> {
        await runAsync(
            `INSERT INTO patients (uuid, emu_id, latest, updated_at_utc, deleted_at_utc)
             VALUES (?, ?, ?, ?, ?)
             ON CONFLICT(uuid) DO UPDATE SET
                emu_id=excluded.emu_id,
                latest=excluded.latest,
                updated_at_utc=excluded.updated_at_utc,
                deleted_at_utc=excluded.deleted_at_utc`,
            [p.uuid, p.emu_id, p.latest ? 1 : 0, p.updated_at_utc ?? utcIsoNow(), p.deleted_at_utc ?? null]
        );
    },

    async setLatest(patient_uuid: string): Promise<void> {
        const now = utcIsoNow();
        // unset all
        await runAsync(`UPDATE patients SET latest = 0, updated_at_utc = ? WHERE deleted_at_utc IS NULL`, [now]);
        // set target
        await runAsync(
            `UPDATE patients
             SET latest = 1, updated_at_utc = ?
             WHERE uuid = ?
                AND deleted_at_utc IS NULL`,
            [now, patient_uuid]
        );
    },

    async softDelete(uuid: string, deleted_at_utc = utcIsoNow()): Promise<void> {
        await runAsync(
            `UPDATE patients
             SET latest = 0,
                deleted_at_utc = ?,
                updated_at_utc = ?
             WHERE uuid = ?`,
            [deleted_at_utc, deleted_at_utc, uuid]
        );
    },

    async renameEmuId(uuid: string, emu_id: string, updated_at_utc = utcIsoNow()): Promise<void> {
        await runAsync(
            `UPDATE patients
             SET emu_id = ?,
                updated_at_utc = ?
             WHERE uuid = ?`,
            [emu_id, updated_at_utc, uuid]
        );
    },

    async hardDelete(uuid: string): Promise<void> {
        await runAsync(`DELETE FROM patients WHERE uuid = ?`, [uuid]);
    },
}
