export interface Patient {
    id?: number; // optional legacy/server
    uuid: string;
    emu_id: string;
    latest: boolean;
    updated_at_utc: string // ISO
    deleted_at_utc?: string | null;
}

export type InterviewStatus = "completed" | "draft";

export interface SimpleInterview {
    id?: number;
    uuid: string;

    patient_uuid: string;

    mood_rating: number;
    energy_rating: number;
    pain_rating: number;
    task_name: string;

    timestamp_start: Date;
    timestamp_save: Date;
    status: InterviewStatus;

    updated_at_utc: string; // ISO
    deleted_at_utc?: string | null;
}

export type OpType = "UPSERT" | "DELETE";

export interface OutboxOp {
    op_id: string;
    device_id: string;

    entity_type: "Patient" | "SimpleInterview";
    entity_uuid: string;
    op_type: OpType;

    scope_patient_uuid: string;

    payload_json: string;

    created_at_ms: number;
    attempts: number;
    next_attempt_at_ms: number;
    last_error?: string | null;
    acked_at_ms?: number | null;
}