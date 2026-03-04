export const API_BASE_URL = process.env.EXPO_PUBLIC_DATABASE_URL;

export interface SyncOpWire {
    op_id: string;
    device_id: string;
    entity_type: "Patient" | "SimpleInterview";
    entity_uuid: string;
    op_type: "UPSERT" | "DELETE";
    scope_patient_uuid: string;
    payload: any | null;
}

export async function syncPush(device_id: string, ops: SyncOpWire[]) {
    const resp = await fetch(`${API_BASE_URL}/sync/push`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ device_id, ops}),
    });
    if (!resp.ok) throw new Error(`sync/push failed: ${resp.status}`);
    return await resp.json();
}

export async function syncPull(patient_uuid: string, since_change_id: number) {
    const url = `${API_BASE_URL}/sync/pull?patient_uuid=${encodeURIComponent(patient_uuid)}&since_change_id=${since_change_id}`;
    const resp = await fetch(url);
    if (!resp.ok) throw new Error(`sync/pull failed: ${resp.status}`);
    return await resp.json();
}

export async function bootstrapByEmu(emu_id: string) {
  const url = `${API_BASE_URL}/sync/bootstrap?emu_id=${encodeURIComponent(emu_id)}`;
  const resp = await fetch(url);
  if (!resp.ok) throw new Error(`sync/bootstrap failed: ${resp.status}`);
  return await resp.json();
}