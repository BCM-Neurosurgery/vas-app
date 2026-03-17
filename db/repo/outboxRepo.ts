import { getAllAsync, runAsync } from '../sqlite';
import { OutboxOp } from '../types';

function replaceExactString(value: any, oldValue: string, newValue: string): any {
    if (typeof value === 'string') {
        return value === oldValue ? newValue : value;
    }

    if (Array.isArray(value)) {
        return value.map((item) => replaceExactString(item, oldValue, newValue));
    }

    if (value && typeof value === 'object') {
        return Object.fromEntries(
            Object.entries(value).map(([key, item]) => [key, replaceExactString(item, oldValue, newValue)])
        );
    }

    return value;
}

export const outboxRepo = {
    async enqueue(op: OutboxOp): Promise<void> {
        await runAsync(
        `INSERT INTO outbox (
         op_id, device_id, entity_type, entity_uuid, op_type, scope_patient_uuid,
         payload_json, created_at_ms, attempts, next_attempt_at_ms, last_error, acked_at_ms
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
            op.op_id, op.device_id, op.entity_type, op.entity_uuid, op.op_type, op.scope_patient_uuid,
            op.payload_json, op.created_at_ms, op.attempts, op.next_attempt_at_ms,
            op.last_error ?? null, op.acked_at_ms ?? null,
        ]
        );
    },

    async getReady(limit = 50): Promise<OutboxOp[]> {
        const now = Date.now();
        const rows = await getAllAsync<any>(
            `SELECT * 
             FROM outbox
             WHERE acked_at_ms IS NULL
                AND next_attempt_at_ms <= ?
             ORDER BY created_at_ms ASC
             LIMIT ?`,
            [now, limit]
        );
        return rows as OutboxOp[];
    },

    async markAcked(op_id: string): Promise<void> {
        await runAsync(`UPDATE outbox SET acked_at_ms = ? WHERE op_id = ?`, [Date.now(), op_id]);
    },

    async markError(op_id: string, error: string): Promise<void> {
        const row = (await getAllAsync<any>(`SELECT attempts FROM outbox WHERE op_id = ?`, [op_id]))[0];
        const attempts = (row?.attempts ?? 0) + 1;
        const backoffMs = Math.min(60_000 * Math.pow(2, Math.min(attempts, 6)), 30 * 60_000);
        await runAsync(
            `UPDATE outbox
             SET attempts = ?, last_error = ?, next_attempt_at_ms = ?
             WHERE op_id = ?`,
            [attempts, error, Date.now() + backoffMs, op_id]
        );
    },

    async rebindPatientUuid(old_patient_uuid: string, new_patient_uuid: string): Promise<void> {
        const rows = await getAllAsync<any>(
            `SELECT *
             FROM outbox
             WHERE acked_at_ms IS NULL
                AND (
                    (entity_type = 'Patient' AND entity_uuid = ?)
                    OR scope_patient_uuid = ?
                    OR payload_json LIKE ?
                )`,
            [old_patient_uuid, old_patient_uuid, `%${old_patient_uuid}%`]
        );

        for (const row of rows) {
            const payload = row.payload_json ? JSON.parse(row.payload_json) : null;
            const nextPayload = replaceExactString(payload, old_patient_uuid, new_patient_uuid);
            const nextEntityUuid =
                row.entity_type === 'Patient' && row.entity_uuid === old_patient_uuid
                    ? new_patient_uuid
                    : row.entity_uuid;
            const nextScopePatientUuid =
                row.scope_patient_uuid === old_patient_uuid
                    ? new_patient_uuid
                    : row.scope_patient_uuid;

            await runAsync(
                `UPDATE outbox
                 SET entity_uuid = ?,
                    scope_patient_uuid = ?,
                    payload_json = ?
                 WHERE op_id = ?`,
                [nextEntityUuid, nextScopePatientUuid, JSON.stringify(nextPayload), row.op_id]
            );
        }
    },
};
