import argparse
import json
import os
import uuid
from collections import defaultdict
from datetime import datetime, timezone
from zoneinfo import ZoneInfo

import pymysql


LEGACY_TZ = ZoneInfo("America/Chicago")
PATIENT_NAMESPACE = uuid.uuid5(uuid.NAMESPACE_URL, "vas-legacy-patient")
INTERVIEW_NAMESPACE = uuid.uuid5(uuid.NAMESPACE_URL, "vas-legacy-interview")


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Port legacy patient/simpleinterview data into the sync-enabled app schema."
    )

    parser.add_argument("--legacy-host", required=True)
    parser.add_argument("--legacy-port", type=int, default=3306)
    parser.add_argument("--legacy-user", required=True)
    parser.add_argument("--legacy-password", required=True)
    parser.add_argument("--legacy-database", required=True)

    parser.add_argument("--target-host", default=os.getenv("DB_HOST", "127.0.0.1"))
    parser.add_argument("--target-port", type=int, default=int(os.getenv("DB_PORT", "3306")))
    parser.add_argument("--target-user", default=os.getenv("DB_USER"))
    parser.add_argument("--target-password", default=os.getenv("DB_PASS"))
    parser.add_argument("--target-database", default=os.getenv("DB_DATABASE"))

    parser.add_argument("--device-id", default="legacy-migration")
    parser.add_argument("--dry-run", action="store_true")

    args = parser.parse_args()

    missing = [
        name
        for name in ("target_user", "target_password", "target_database")
        if not getattr(args, name)
    ]
    if missing:
        parser.error(f"Missing target connection values: {', '.join(missing)}")

    return args


def mysql_connect(host: str, port: int, user: str, password: str, database: str):
    return pymysql.connect(
        host=host,
        port=port,
        user=user,
        password=password,
        database=database,
        charset="utf8mb4",
        cursorclass=pymysql.cursors.DictCursor,
        autocommit=False,
    )


def local_to_utc(value) -> datetime:
    if isinstance(value, str):
        naive = datetime.fromisoformat(value)
    else:
        naive = value

    aware = naive.replace(tzinfo=LEGACY_TZ)
    return aware.astimezone(timezone.utc)


def isoformat_utc(dt: datetime) -> str:
    return (
        dt.astimezone(timezone.utc)
        .isoformat(timespec="milliseconds")
        .replace("+00:00", "Z")
    )


def patient_uuid_for_legacy_id(legacy_id: int) -> str:
    return str(uuid.uuid5(PATIENT_NAMESPACE, f"patient:{legacy_id}"))


def interview_uuid_for_legacy_id(legacy_id: int) -> str:
    return str(uuid.uuid5(INTERVIEW_NAMESPACE, f"interview:{legacy_id}"))


def fetch_legacy_rows(conn):
    with conn.cursor() as cur:
        cur.execute("SELECT id, emu_id, latest FROM patient ORDER BY id ASC")
        patients = cur.fetchall()

        cur.execute(
            """
            SELECT
                id,
                patient_id,
                mood_rating,
                energy_rating,
                pain_rating,
                task_name,
                timestamp_start,
                timestamp_save,
                status
            FROM simpleinterview
            ORDER BY timestamp_save ASC, id ASC
            """
        )
        interviews = cur.fetchall()

    return patients, interviews


def ensure_sync_operation(cur, op_id: str, device_id: str, received_at_utc: datetime):
    cur.execute("SELECT 1 FROM sync_operation WHERE op_id = %s", (op_id,))
    if cur.fetchone():
        return

    cur.execute(
        """
        INSERT INTO sync_operation (op_id, device_id, received_at_utc, status, error)
        VALUES (%s, %s, %s, %s, %s)
        """,
        (op_id, device_id, received_at_utc, "ACK", None),
    )


def ensure_change(
    cur,
    *,
    op_id: str,
    device_id: str,
    entity_type: str,
    entity_uuid: str,
    scope_patient_uuid: str,
    server_ts_utc: datetime,
    payload: dict,
):
    cur.execute("SELECT 1 FROM `change` WHERE op_id = %s", (op_id,))
    if cur.fetchone():
        return

    cur.execute(
        """
        INSERT INTO `change` (
            device_id,
            op_id,
            entity_type,
            entity_uuid,
            op_type,
            scope_patient_uuid,
            server_ts_utc,
            payload_json
        ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
        """,
        (
            device_id,
            op_id,
            entity_type,
            entity_uuid,
            "UPSERT",
            scope_patient_uuid,
            server_ts_utc,
            json.dumps(payload),
        ),
    )


def main():
    args = parse_args()

    legacy_conn = mysql_connect(
        args.legacy_host,
        args.legacy_port,
        args.legacy_user,
        args.legacy_password,
        args.legacy_database,
    )
    target_conn = mysql_connect(
        args.target_host,
        args.target_port,
        args.target_user,
        args.target_password,
        args.target_database,
    )

    try:
        legacy_patients, legacy_interviews = fetch_legacy_rows(legacy_conn)
        interviews_by_patient_id = defaultdict(list)
        for interview in legacy_interviews:
            interviews_by_patient_id[interview["patient_id"]].append(interview)

        patient_rows = []
        for patient in legacy_patients:
            patient_interviews = interviews_by_patient_id.get(patient["id"], [])
            latest_save_utc = (
                max(local_to_utc(row["timestamp_save"]) for row in patient_interviews)
                if patient_interviews
                else utcnow()
            )
            patient_rows.append(
                {
                    "legacy_id": patient["id"],
                    "uuid": patient_uuid_for_legacy_id(patient["id"]),
                    "emu_id": patient["emu_id"],
                    "latest": bool(patient["latest"]),
                    "updated_at_utc": latest_save_utc,
                    "deleted_at_utc": None,
                }
            )

        if args.dry_run:
            print(f"Would migrate {len(patient_rows)} patients and {len(legacy_interviews)} interviews.")
            return

        with target_conn.cursor() as cur:
            patient_id_map: dict[int, tuple[int, str]] = {}

            for patient in patient_rows:
                cur.execute(
                    """
                    INSERT INTO patient (uuid, emu_id, latest, updated_at_utc, deleted_at_utc)
                    VALUES (%s, %s, %s, %s, %s)
                    ON DUPLICATE KEY UPDATE
                        emu_id = VALUES(emu_id),
                        latest = VALUES(latest),
                        updated_at_utc = VALUES(updated_at_utc),
                        deleted_at_utc = VALUES(deleted_at_utc)
                    """,
                    (
                        patient["uuid"],
                        patient["emu_id"],
                        1 if patient["latest"] else 0,
                        patient["updated_at_utc"],
                        patient["deleted_at_utc"],
                    ),
                )

                cur.execute("SELECT id FROM patient WHERE uuid = %s", (patient["uuid"],))
                target_patient = cur.fetchone()
                patient_id_map[patient["legacy_id"]] = (target_patient["id"], patient["uuid"])

                op_id = f"legacy-import:Patient:{patient['legacy_id']}"
                ensure_sync_operation(cur, op_id, args.device_id, patient["updated_at_utc"])
                ensure_change(
                    cur,
                    op_id=op_id,
                    device_id=args.device_id,
                    entity_type="Patient",
                    entity_uuid=patient["uuid"],
                    scope_patient_uuid=patient["uuid"],
                    server_ts_utc=patient["updated_at_utc"],
                    payload={
                        "uuid": patient["uuid"],
                        "emu_id": patient["emu_id"],
                        "latest": patient["latest"],
                        "updated_at_utc": isoformat_utc(patient["updated_at_utc"]),
                        "deleted_at_utc": None,
                    },
                )

            for interview in legacy_interviews:
                timestamp_start_utc = local_to_utc(interview["timestamp_start"])
                timestamp_save_utc = local_to_utc(interview["timestamp_save"])
                updated_at_utc = timestamp_save_utc

                target_patient_id, target_patient_uuid = patient_id_map[interview["patient_id"]]
                interview_uuid = interview_uuid_for_legacy_id(interview["id"])

                cur.execute(
                    """
                    INSERT INTO simpleinterview (
                        uuid,
                        patient_id,
                        patient_uuid,
                        mood_rating,
                        energy_rating,
                        pain_rating,
                        task_name,
                        timestamp_start,
                        timestamp_save,
                        status,
                        updated_at_utc,
                        deleted_at_utc
                    ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                    ON DUPLICATE KEY UPDATE
                        patient_id = VALUES(patient_id),
                        patient_uuid = VALUES(patient_uuid),
                        mood_rating = VALUES(mood_rating),
                        energy_rating = VALUES(energy_rating),
                        pain_rating = VALUES(pain_rating),
                        task_name = VALUES(task_name),
                        timestamp_start = VALUES(timestamp_start),
                        timestamp_save = VALUES(timestamp_save),
                        status = VALUES(status),
                        updated_at_utc = VALUES(updated_at_utc),
                        deleted_at_utc = VALUES(deleted_at_utc)
                    """,
                    (
                        interview_uuid,
                        target_patient_id,
                        target_patient_uuid,
                        int(interview["mood_rating"]),
                        int(interview["energy_rating"]),
                        int(interview["pain_rating"]),
                        interview["task_name"],
                        timestamp_start_utc,
                        timestamp_save_utc,
                        interview["status"],
                        updated_at_utc,
                        None,
                    ),
                )

                op_id = f"legacy-import:SimpleInterview:{interview['id']}"
                ensure_sync_operation(cur, op_id, args.device_id, updated_at_utc)
                ensure_change(
                    cur,
                    op_id=op_id,
                    device_id=args.device_id,
                    entity_type="SimpleInterview",
                    entity_uuid=interview_uuid,
                    scope_patient_uuid=target_patient_uuid,
                    server_ts_utc=updated_at_utc,
                    payload={
                        "uuid": interview_uuid,
                        "patient_uuid": target_patient_uuid,
                        "mood_rating": int(interview["mood_rating"]),
                        "energy_rating": int(interview["energy_rating"]),
                        "pain_rating": int(interview["pain_rating"]),
                        "task_name": interview["task_name"],
                        "timestamp_start": isoformat_utc(timestamp_start_utc),
                        "timestamp_save": isoformat_utc(timestamp_save_utc),
                        "status": interview["status"],
                        "updated_at_utc": isoformat_utc(updated_at_utc),
                        "deleted_at_utc": None,
                    },
                )

        target_conn.commit()
        print(f"Migrated {len(patient_rows)} patients and {len(legacy_interviews)} interviews.")
    except Exception:
        target_conn.rollback()
        raise
    finally:
        legacy_conn.close()
        target_conn.close()


if __name__ == "__main__":
    main()
