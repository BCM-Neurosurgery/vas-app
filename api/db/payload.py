from pydantic import BaseModel
from typing import Literal, Any

OpType = Literal["UPSERT", "DELETE"]

class SyncOp(BaseModel):
    op_id: str
    device_id: str
    entity_type: Literal["Patient", "SimpleInterview"]
    entity_uuid: str
    op_type: OpType
    scope_patient_uuid: str
    payload: dict[str, Any] | None = None # required for UPSERT

class SyncPushRequest(BaseModel):
    device_id: str
    ops: list[SyncOp]

class SyncOpResult(BaseModel):
    op_id: str
    status: Literal["ACK", "REJECT"]
    error: str | None = None

class SyncPushResponse(BaseModel):
    latest_change_id: int
    results: list[SyncOpResult]

class SyncPullResponse(BaseModel):
    latest_change_id: int
    changes: list[dict[str, Any]] # each includes change_id + op metadata + payload