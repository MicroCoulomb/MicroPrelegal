"""Database bootstrap and data access helpers."""

from __future__ import annotations

import hashlib
import hmac
import sqlite3
from secrets import token_urlsafe

from app.config import DATA_DIR, DATABASE_PATH
from app.auth import AuthUser
from app.documents import get_supported_document
from app.drafting import ChatMessage, DraftingState
from app.drafts import DraftDetail, DraftSummary, build_document_ref
from app.schema import (
    CREATE_DRAFT_MESSAGES_TABLE_SQL,
    CREATE_DRAFTS_TABLE_SQL,
    CREATE_SESSIONS_TABLE_SQL,
    CREATE_USERS_TABLE_SQL,
    DROP_DRAFT_MESSAGES_TABLE_SQL,
    DROP_DRAFTS_TABLE_SQL,
    DROP_SESSIONS_TABLE_SQL,
    DROP_USERS_TABLE_SQL,
)

SESSION_COOKIE_NAME = "microprelegal_session"


def reset_database() -> None:
    """Recreate the temporary SQLite database from scratch."""
    DATA_DIR.mkdir(parents=True, exist_ok=True)

    with sqlite3.connect(DATABASE_PATH) as connection:
        connection.execute("PRAGMA foreign_keys = ON")
        connection.execute(DROP_DRAFT_MESSAGES_TABLE_SQL)
        connection.execute(DROP_DRAFTS_TABLE_SQL)
        connection.execute(DROP_SESSIONS_TABLE_SQL)
        connection.execute(DROP_USERS_TABLE_SQL)
        connection.execute(CREATE_USERS_TABLE_SQL)
        connection.execute(CREATE_SESSIONS_TABLE_SQL)
        connection.execute(CREATE_DRAFTS_TABLE_SQL)
        connection.execute(CREATE_DRAFT_MESSAGES_TABLE_SQL)
        connection.commit()


def open_connection() -> sqlite3.Connection:
    """Open a SQLite connection with row access enabled."""

    connection = sqlite3.connect(DATABASE_PATH)
    connection.row_factory = sqlite3.Row
    connection.execute("PRAGMA foreign_keys = ON")
    return connection


def hash_password(password: str) -> str:
    """Hash a password for temporary local auth."""

    salt = token_urlsafe(16)
    digest = hashlib.scrypt(password.encode("utf-8"), salt=salt.encode("utf-8"), n=16384, r=8, p=1).hex()
    return f"{salt}${digest}"


def verify_password(password: str, password_hash: str) -> bool:
    """Verify a plaintext password against the stored hash."""

    salt, expected_digest = password_hash.split("$", maxsplit=1)
    actual_digest = hashlib.scrypt(password.encode("utf-8"), salt=salt.encode("utf-8"), n=16384, r=8, p=1).hex()
    return hmac.compare_digest(actual_digest, expected_digest)


def create_user(name: str, email: str, password: str) -> AuthUser:
    """Create a new user row."""

    normalized_email = email.strip().lower()
    with open_connection() as connection:
        cursor = connection.execute(
            "INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)",
            (name.strip(), normalized_email, hash_password(password)),
        )
        connection.commit()
        user_id = cursor.lastrowid

    return AuthUser(id=user_id, name=name.strip(), email=normalized_email)


def get_user_by_email(email: str) -> sqlite3.Row | None:
    """Fetch a user row by normalized email."""

    with open_connection() as connection:
        return connection.execute(
            "SELECT id, name, email, password_hash FROM users WHERE email = ?",
            (email.strip().lower(),),
        ).fetchone()


def create_session(user_id: int) -> str:
    """Create a new session token for a user."""

    token = token_urlsafe(32)
    with open_connection() as connection:
        connection.execute("INSERT INTO sessions (user_id, token) VALUES (?, ?)", (user_id, token))
        connection.commit()
    return token


def delete_session(token: str) -> None:
    """Delete a session token if it exists."""

    with open_connection() as connection:
        connection.execute("DELETE FROM sessions WHERE token = ?", (token,))
        connection.commit()


def get_user_by_session(token: str | None) -> AuthUser | None:
    """Resolve the currently authenticated user from a session token."""

    if not token:
        return None

    with open_connection() as connection:
        row = connection.execute(
            """
            SELECT users.id, users.name, users.email
            FROM sessions
            JOIN users ON users.id = sessions.user_id
            WHERE sessions.token = ?
            """,
            (token,),
        ).fetchone()

    if not row:
        return None

    return AuthUser(id=row["id"], name=row["name"], email=row["email"])


def create_draft(user_id: int) -> DraftDetail:
    """Create an empty draft for a user."""

    with open_connection() as connection:
        cursor = connection.execute(
            """
            INSERT INTO drafts (
                user_id,
                title,
                selected_document_filename,
                suggested_document_filename,
                preview_content,
                status_note,
                is_complete
            ) VALUES (?, ?, ?, ?, ?, ?, ?)
            """,
            (user_id, "Untitled draft", None, None, "", "Describe the document you need to start drafting.", 0),
        )
        draft_id = cursor.lastrowid
        connection.commit()

    return get_draft_detail(user_id, draft_id)


def list_drafts(user_id: int) -> list[DraftSummary]:
    """List saved drafts for a user."""

    with open_connection() as connection:
        rows = connection.execute(
            """
            SELECT id, title, selected_document_filename, updated_at, is_complete, status_note
            FROM drafts
            WHERE user_id = ?
            ORDER BY updated_at DESC, id DESC
            """,
            (user_id,),
        ).fetchall()

    return [
        DraftSummary(
            id=row["id"],
            title=row["title"],
            selected_document_filename=row["selected_document_filename"],
            updated_at=row["updated_at"],
            is_complete=bool(row["is_complete"]),
            status_note=row["status_note"],
        )
        for row in rows
    ]


def get_draft_detail(user_id: int, draft_id: int) -> DraftDetail | None:
    """Fetch a full draft if it belongs to the user."""

    with open_connection() as connection:
        draft_row = connection.execute(
            """
            SELECT id, title, selected_document_filename, suggested_document_filename, preview_content,
                   status_note, is_complete, updated_at
            FROM drafts
            WHERE id = ? AND user_id = ?
            """,
            (draft_id, user_id),
        ).fetchone()
        if not draft_row:
            return None

        message_rows = connection.execute(
            """
            SELECT role, content
            FROM draft_messages
            WHERE draft_id = ?
            ORDER BY position ASC, id ASC
            """,
            (draft_id,),
        ).fetchall()

    messages = [ChatMessage(role=row["role"], content=row["content"]) for row in message_rows]
    preview_content = draft_row["preview_content"]
    state = DraftingState(
        selected_document_filename=draft_row["selected_document_filename"],
        suggested_document_filename=draft_row["suggested_document_filename"],
        preview_content=preview_content,
    )
    return DraftDetail(
        id=draft_row["id"],
        title=draft_row["title"],
        messages=messages,
        state=state,
        selected_document=build_document_ref(draft_row["selected_document_filename"]),
        suggested_document=build_document_ref(draft_row["suggested_document_filename"]),
        preview_content=preview_content,
        is_complete=bool(draft_row["is_complete"]),
        status_note=draft_row["status_note"],
        updated_at=draft_row["updated_at"],
    )


def update_draft(
    user_id: int,
    draft_id: int,
    messages: list[ChatMessage],
    state: DraftingState,
    preview_content: str,
    is_complete: bool,
    status_note: str,
) -> DraftDetail | None:
    """Overwrite a saved draft session."""

    title = _derive_draft_title(messages, state.selected_document_filename)

    with open_connection() as connection:
        existing = connection.execute(
            "SELECT id FROM drafts WHERE id = ? AND user_id = ?",
            (draft_id, user_id),
        ).fetchone()
        if not existing:
            return None

        connection.execute(
            """
            UPDATE drafts
            SET title = ?,
                selected_document_filename = ?,
                suggested_document_filename = ?,
                preview_content = ?,
                status_note = ?,
                is_complete = ?,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = ? AND user_id = ?
            """,
            (
                title,
                state.selected_document_filename,
                state.suggested_document_filename,
                preview_content,
                status_note,
                int(is_complete),
                draft_id,
                user_id,
            ),
        )
        connection.execute("DELETE FROM draft_messages WHERE draft_id = ?", (draft_id,))
        connection.executemany(
            "INSERT INTO draft_messages (draft_id, role, content, position) VALUES (?, ?, ?, ?)",
            [(draft_id, message.role, message.content, index) for index, message in enumerate(messages)],
        )
        connection.commit()

    return get_draft_detail(user_id, draft_id)


def authenticate_user(email: str, password: str) -> AuthUser | None:
    """Verify credentials and return the authenticated user."""

    row = get_user_by_email(email)
    if not row:
        return None
    if not verify_password(password, row["password_hash"]):
        return None
    return AuthUser(id=row["id"], name=row["name"], email=row["email"])


def _derive_draft_title(messages: list[ChatMessage], selected_document_filename: str | None) -> str:
    """Create a short human-readable draft title."""

    if selected_document_filename:
        document = get_supported_document(selected_document_filename)
        if document:
            return document.name

    first_user_message = next((message.content.strip() for message in messages if message.role == "user"), "")
    if first_user_message:
        compact = " ".join(first_user_message.split())
        return compact[:72]

    return "Untitled draft"
