import { outboxRepo } from "../repo/outboxRepo";
import { patientRepo } from "../repo/patientRepo";
import { syncStateRepo } from "../repo/syncStateRepo";
import { interviewRepo } from "../repo/interviewRepo";
import { withTransaction } from "../sqlite";
import { OutboxOp } from "../types";
import { applyDelete, applyUpsert } from "./apply";
import { getPatientByEmu, syncPull, syncPush } from "./syncClient";
import { emitPatientRebind, emitSyncNotice } from "./syncNotice";
import { utcIsoNow } from "../util/time";


const DEVICE_ID_KEY = "device_id"; // TODO: fix this, very sus rn

async function getOrCreateDeviceId(): Promise<string> {
    const existing = await syncStateRepo.get(DEVICE_ID_KEY);
    if (existing) return existing;
    const fresh = crypto.randomUUID(); 
    await syncStateRepo.set(DEVICE_ID_KEY, fresh);
    return fresh;
}

function lastChangeKey(patient_uuid: string) {
    return `last_change_id:${patient_uuid}`;
}

// debounced kick
let inFlight = false;
let pending = false;
let lastSyncNoticeAt = 0;

async function reconcilePatientUuidCollision(oldPatientUuid: string, serverPatientUuid: string) {
    const existing = await patientRepo.getByUuid(oldPatientUuid);
    if (!existing) return;

    const now = utcIsoNow();
    const tempEmuId = `${existing.emu_id}__local_conflict__${oldPatientUuid}`;

    await withTransaction(async () => {
        await patientRepo.renameEmuId(oldPatientUuid, tempEmuId, now);
        await patientRepo.upsert({
            uuid: serverPatientUuid,
            emu_id: existing.emu_id,
            latest: existing.latest,
            updated_at_utc: now,
            deleted_at_utc: null,
        });
        await interviewRepo.reassignPatientUuid(oldPatientUuid, serverPatientUuid, now);
        await outboxRepo.rebindPatientUuid(oldPatientUuid, serverPatientUuid);
        await patientRepo.hardDelete(oldPatientUuid);
        await syncStateRepo.delete(lastChangeKey(oldPatientUuid));
    });

    emitPatientRebind(oldPatientUuid, serverPatientUuid);
}

async function reconcileReadyPatientCollisions(readyOps: OutboxOp[], currentPatientUuid: string): Promise<string> {
    let effectivePatientUuid = currentPatientUuid;

    for (const op of readyOps) {
        if (op.entity_type !== "Patient" || op.op_type !== "UPSERT") continue;

        const payload = JSON.parse(op.payload_json);
        const emuId = payload?.emu_id;
        const localPatientUuid = payload?.uuid ?? op.entity_uuid;
        if (!emuId || !localPatientUuid) continue;

        const serverPatient = await getPatientByEmu(emuId);
        if (!serverPatient || serverPatient.patient_uuid === localPatientUuid) continue;

        await reconcilePatientUuidCollision(localPatientUuid, serverPatient.patient_uuid);
        emitSyncNotice(`Connected to existing server patient "${emuId}". Local data has been reconciled.`);

        if (effectivePatientUuid === localPatientUuid) {
            effectivePatientUuid = serverPatient.patient_uuid;
        }
    }

    return effectivePatientUuid;
}

export const syncEngine = {
    async syncNow(patient_uuid: string): Promise<void> {
        if (inFlight) { pending = true; return; }
        inFlight = true;
        pending = false;

        try {
            const device_id = await getOrCreateDeviceId();
            let effectivePatientUuid = patient_uuid;

            const readyOps = await outboxRepo.getReady(50);
            effectivePatientUuid = await reconcileReadyPatientCollisions(readyOps, effectivePatientUuid);

            // 1) push
            const batch = await outboxRepo.getReady(50);
            if (batch.length > 0) {
                const ops = batch.map((o: OutboxOp) => ({
                    op_id: o.op_id,
                    device_id: o.device_id,
                    entity_type: o.entity_type,
                    entity_uuid: o.entity_uuid,
                    op_type: o.op_type,
                    scope_patient_uuid: o.scope_patient_uuid,
                    payload: JSON.parse(o.payload_json),
                }));

                const resp = await syncPush(device_id, ops);
                await withTransaction(async () => {
                    for (const r of resp.results) {
                        if (r.status === "ACK") await outboxRepo.markAcked(r.op_id);
                        else await outboxRepo.markError(r.op_id, r.error ?? "REJECT")
                    }
                });
            }

            // 2) pull
            const sinceStr = await syncStateRepo.get(lastChangeKey(effectivePatientUuid));
            const since = sinceStr ? parseInt(sinceStr, 10) : 0;
            const pullResp = await syncPull(effectivePatientUuid, since);

            await withTransaction(async () => {
                for (const ch of pullResp.changes) {
                    if (ch.op_type === "UPSERT") {
                        await applyUpsert(ch.entity_type, ch.payload);
                    } else if (ch.op_type === "DELETE") {
                        await applyDelete(ch.entity_type, ch.entity_uuid, ch.payload);
                    }
                }
                await syncStateRepo.set(lastChangeKey(effectivePatientUuid), String(pullResp.latest_change_id));
            });

        } catch (e: any) {
            const now = Date.now();
            if (now - lastSyncNoticeAt > 5000) {
                lastSyncNoticeAt = now;
                emitSyncNotice("Sync unavailable. Your changes are still saved locally.");
            }

        } finally {
            inFlight = false;
            if (pending) {
                // run one more time quickly
                pending = false;
                await this.syncNow(patient_uuid);
            }
        }
    },
};
