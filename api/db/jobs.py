from datetime import datetime, timezone
from sqlmodel import Session, select
from exponent_server_sdk import (
    PushClient,
    PushTicket,
    PushMessage,
    PushServerError,
    DeviceNotRegisteredError, 
    InvalidCredentialsError
)

from .models import PushRegistration, NotificationLog
from .engine import DB_ENGINE


MAX_PER_BATCH = 100  # Expo recommends chunks of ~100

def chunked(iterable, size):
    it = iter(iterable)
    while True:
        buf = list()
        try:
            for _ in range(size):
                buf.append(next(it))
        except StopIteration:
            if buf:
                yield buf
            break
        yield buf

async def send_due_notifications():
    with Session(DB_ENGINE) as session:
        due_statement = (
            select(NotificationLog, PushRegistration)
            .join(PushRegistration, PushRegistration.id == NotificationLog.token_id)
            .where(NotificationLog.sent_at_utc.is_(None))
            .where(NotificationLog.planned_at_utc <= datetime.now(timezone.utc))
            .limit(1000)  # safety cap per tick
        )
        rows = session.exec(due_statement).all()

        if not rows:
            return

        # Build push messages
        messages = []
        row_by_index = []
        for log, pr in rows:
            token = pr.expo_push_token
            # Expo token sanity check
            if not token or "ExponentPushToken" not in token:
                log.status = "invalid_token"
                session.add(log)
                continue

            body_text = f"Time for mood check-in!"  # customize based on schedule
            messages.append(PushMessage(to=token, sound="default", body=body_text))
            row_by_index.append((log, pr))

        client = PushClient()
        # Send in chunks
        for batch in chunked(list(zip(messages, row_by_index)), MAX_PER_BATCH):
            msgs, pairs = zip(*batch)
            try:
                tickets = client.publish_multiple(list(msgs))
            except (PushServerError, InvalidCredentialsError) as e:
                # server or auth issue: mark as unknown to retry later
                for (log, _pr) in (p for _, p in pairs):
                    log.status = "unknown"
                session.commit()
                continue

            # Save tickets
            for ticket, (log, _pr) in zip(tickets, pairs):
                if ticket.status == "ok":
                    log.ticket_id = ticket.id
                    log.status = "queued"
                else:
                    # Immediate error from Expo
                    log.status = "error"
                    log.error = str(ticket.message or ticket)
                log.sent_at_utc = datetime.now(timezone.utc)
                session.add(log)

        session.commit()

async def check_expo_receipts():
    with Session(DB_ENGINE) as session:
        statement = select(NotificationLog).where(
            NotificationLog.ticket_id.is_not(None),
            NotificationLog.status.in_(("queued", "unknown"))
        ).limit(2000)
        logs = session.exec(statement).all()
        if not logs:
            return

        # Expo receipts API takes ticket IDs in batches
        client = PushClient()
        for batch in chunked(logs, MAX_PER_BATCH):
            receipt_ids = [
                PushTicket(id=l.ticket_id, push_message='', status='', message='', details='') for l in batch if l.ticket_id
                ]
            if not receipt_ids:
                continue
            receipts = client.check_receipts(receipt_ids)
            # receipts is a dict id -> {status, details?, message?}
            for log, receipt in zip(batch, receipts):
                status = receipt.status
                if status == "ok":
                    log.status = "delivered"
                elif status == "error":
                    # Common error: DeviceNotRegistered => drop token?
                    log.status = "error"
                    log.error = str(receipt.message or receipt)
                else:
                    log.status = "unknown"
                session.add(log)

        session.commit()

