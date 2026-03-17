type SyncNoticeListener = (message: string) => void;
type PatientRebindListener = (oldUuid: string, newUuid: string) => void;

const listeners = new Set<SyncNoticeListener>();
const patientRebindListeners = new Set<PatientRebindListener>();

export function emitSyncNotice(message: string) {
  for (const listener of listeners) {
    listener(message);
  }
}

export function subscribeSyncNotice(listener: SyncNoticeListener) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function emitPatientRebind(oldUuid: string, newUuid: string) {
  for (const listener of patientRebindListeners) {
    listener(oldUuid, newUuid);
  }
}

export function subscribePatientRebind(listener: PatientRebindListener) {
  patientRebindListeners.add(listener);
  return () => {
    patientRebindListeners.delete(listener);
  };
}
