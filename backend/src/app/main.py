"""FastAPI application entrypoint."""

from __future__ import annotations

from contextlib import asynccontextmanager
import logging
from pathlib import Path

import sqlite3

from fastapi import Cookie, Depends, FastAPI, HTTPException, Response, status
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from app.config import FRONTEND_DIST_DIR
from app.auth import AuthSessionResponse, AuthUser, SignInRequest, SignUpRequest
from app.db import (
    SESSION_COOKIE_NAME,
    authenticate_user,
    create_draft,
    create_session,
    create_user,
    delete_session,
    get_draft_detail,
    get_user_by_email,
    get_user_by_session,
    list_drafts,
    reset_database,
    update_draft,
)
from app.drafting import DraftingChatRequest, DraftingChatResponse
from app.drafts import CreateDraftResponse, DraftDetailResponse, DraftSummaryListResponse, UpdateDraftRequest
from app.drafting_chat import LiteLlmDraftingChatService

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(application: FastAPI):
    """Initialize application state on startup."""
    reset_database()
    application.state.drafting_chat_service = LiteLlmDraftingChatService()
    yield


app = FastAPI(title="MicroPrelegal", lifespan=lifespan)


def _set_session_cookie(response: Response, token: str) -> None:
    """Attach the auth cookie to the response."""

    response.set_cookie(
        key=SESSION_COOKIE_NAME,
        value=token,
        httponly=True,
        samesite="lax",
        secure=False,
        path="/",
    )


def _clear_session_cookie(response: Response) -> None:
    """Clear the auth cookie from the response."""

    response.delete_cookie(key=SESSION_COOKIE_NAME, path="/")


def _require_user(session_token: str | None = Cookie(default=None, alias=SESSION_COOKIE_NAME)) -> AuthUser:
    """Require an authenticated user."""

    user = get_user_by_session(session_token)
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Authentication required.")
    return user


@app.get("/api/health")
async def healthcheck() -> dict[str, str]:
    """Return a basic service health payload."""
    return {"status": "ok"}


@app.post("/api/auth/signup", response_model=AuthSessionResponse, status_code=status.HTTP_201_CREATED)
async def sign_up(request: SignUpRequest, response: Response) -> AuthSessionResponse:
    """Create a user and sign them in."""

    if get_user_by_email(request.email):
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="An account with that email already exists.")

    try:
        user = create_user(request.name, request.email, request.password)
    except sqlite3.IntegrityError as exc:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="An account with that email already exists.") from exc

    _set_session_cookie(response, create_session(user.id))
    return AuthSessionResponse(user=user)


@app.post("/api/auth/signin", response_model=AuthSessionResponse)
async def sign_in(request: SignInRequest, response: Response) -> AuthSessionResponse:
    """Authenticate an existing user."""

    user = authenticate_user(request.email, request.password)
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid email or password.")

    _set_session_cookie(response, create_session(user.id))
    return AuthSessionResponse(user=user)


@app.post("/api/auth/signout", status_code=status.HTTP_204_NO_CONTENT)
async def sign_out(response: Response, session_token: str | None = Cookie(default=None, alias=SESSION_COOKIE_NAME)) -> Response:
    """Sign the current user out."""

    if session_token:
        delete_session(session_token)
    _clear_session_cookie(response)
    response.status_code = status.HTTP_204_NO_CONTENT
    return response


@app.get("/api/auth/session", response_model=AuthSessionResponse)
async def session(user: AuthUser = Depends(_require_user)) -> AuthSessionResponse:
    """Return the current signed-in user."""

    return AuthSessionResponse(user=user)


@app.get("/api/drafts", response_model=DraftSummaryListResponse)
async def drafts(user: AuthUser = Depends(_require_user)) -> DraftSummaryListResponse:
    """List saved drafts for the current user."""

    return DraftSummaryListResponse(drafts=list_drafts(user.id))


@app.post("/api/drafts", response_model=CreateDraftResponse, status_code=status.HTTP_201_CREATED)
async def create_user_draft(user: AuthUser = Depends(_require_user)) -> CreateDraftResponse:
    """Create a fresh empty draft for the current user."""

    return CreateDraftResponse(draft=create_draft(user.id))


@app.get("/api/drafts/{draft_id}", response_model=DraftDetailResponse)
async def draft_detail(draft_id: int, user: AuthUser = Depends(_require_user)) -> DraftDetailResponse:
    """Return one saved draft for the current user."""

    draft = get_draft_detail(user.id, draft_id)
    if not draft:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Draft not found.")
    return DraftDetailResponse(draft=draft)


@app.put("/api/drafts/{draft_id}", response_model=DraftDetailResponse)
async def save_draft(
    draft_id: int,
    request: UpdateDraftRequest,
    user: AuthUser = Depends(_require_user),
) -> DraftDetailResponse:
    """Persist the latest state of a saved draft."""

    draft = update_draft(
        user.id,
        draft_id,
        request.messages,
        request.state,
        request.preview_content,
        request.is_complete,
        request.status_note,
    )
    if not draft:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Draft not found.")
    return DraftDetailResponse(draft=draft)


@app.post("/api/drafting/chat")
async def drafting_chat(request: DraftingChatRequest) -> DraftingChatResponse:
    """Run one generic drafting chat turn and return the updated draft."""

    try:
        result = app.state.drafting_chat_service.generate_reply(request.messages, request.state)
    except RuntimeError as exc:
        logger.exception("Drafting chat runtime failure.")
        raise HTTPException(status_code=500, detail=str(exc)) from exc
    except Exception as exc:
        logger.exception("Drafting chat request failed.")
        raise HTTPException(status_code=502, detail="Failed to generate drafting chat response.") from exc

    return result


if (FRONTEND_DIST_DIR / "_next").exists():
    app.mount("/_next", StaticFiles(directory=FRONTEND_DIST_DIR / "_next"), name="next-assets")


@app.get("/{full_path:path}")
async def frontend_app(full_path: str) -> FileResponse:
    """Serve static frontend files with HTML fallback for app routes."""

    requested_path = FRONTEND_DIST_DIR / full_path

    if full_path and requested_path.is_file():
        return FileResponse(requested_path)

    nested_index = FRONTEND_DIST_DIR / full_path / "index.html" if full_path else FRONTEND_DIST_DIR / "index.html"
    if nested_index.exists():
        return FileResponse(nested_index)

    index_path = FRONTEND_DIST_DIR / "index.html"
    if index_path.exists():
        return FileResponse(index_path)

    raise HTTPException(status_code=404, detail=f"Static frontend asset not found for {Path(full_path or '/').as_posix()}.")
