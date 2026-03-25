"""Authentication request and response schemas."""

from __future__ import annotations

from app.nda import CamelModel


class AuthUser(CamelModel):
    """Authenticated user profile returned to the frontend."""

    id: int
    name: str
    email: str


class SignUpRequest(CamelModel):
    """Sign-up payload."""

    name: str
    email: str
    password: str


class SignInRequest(CamelModel):
    """Sign-in payload."""

    email: str
    password: str


class AuthSessionResponse(CamelModel):
    """Authenticated session response."""

    user: AuthUser
