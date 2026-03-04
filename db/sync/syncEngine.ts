import { outboxRepo } from "../repo/outboxRepo";
import { syncStateRepo } from "../repo/syncStateRepo";
import { withTransaction } from "../sqlite";
import { OutboxOp } from "../types";
import { applyUpsert } from "./apply";
import { syncPull, syncPush } from "./syncClient";


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

export const syncEngine = {
    async syncNow(patient_uuid: string): Promise<void> {
        if (inFlight) { pending = true; return; }
        inFlight = true;
        pending = false;

        try {
            const device_id = await getOrCreateDeviceId();

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
            const sinceStr = await syncStateRepo.get(lastChangeKey(patient_uuid));
            const since = sinceStr ? parseInt(sinceStr, 10) : 0;
            const pullResp = await syncPull(patient_uuid, since);

            await withTransaction(async () => {
                for (const ch of pullResp.changes) {
                    if (ch.op_type === "UPSERT") {
                        await applyUpsert(ch.entity_type, ch.payload);
                    } else if (ch.op_type === "DELETE") {
                        // implement later; optional for phase 1
                    }
                }
                await syncStateRepo.set(lastChangeKey(patient_uuid), String(pullResp.latest_change_id));
            });

        } catch (e: any) {
            // swallow errors and log

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

