"""Saved draft request and response schemas."""

from __future__ import annotations

from app.documents import get_supported_document
from app.drafting import ChatMessage, DocumentRef, DraftingState
from app.nda import CamelModel


class DraftSummary(CamelModel):
    """Saved draft summary for list views."""

    id: int
    title: str
    selected_document_filename: str | None = None
    updated_at: str
    is_complete: bool
    status_note: str


class DraftSummaryListResponse(CamelModel):
    """Saved draft list response."""

    drafts: list[DraftSummary]


class DraftDetail(CamelModel):
    """Full saved drafting session."""

    id: int
    title: str
    messages: list[ChatMessage]
    state: DraftingState
    selected_document: DocumentRef | None = None
    suggested_document: DocumentRef | None = None
    preview_content: str
    is_complete: bool
    status_note: str
    updated_at: str


class DraftDetailResponse(CamelModel):
    """Single draft response."""

    draft: DraftDetail


class CreateDraftResponse(CamelModel):
    """Created draft response."""

    draft: DraftDetail


class UpdateDraftRequest(CamelModel):
    """Draft session update payload."""

    messages: list[ChatMessage]
    state: DraftingState
    preview_content: str
    is_complete: bool
    status_note: str


def build_document_ref(filename: str | None) -> DocumentRef | None:
    """Resolve a saved filename into API document metadata."""

    if not filename:
        return None

    document = get_supported_document(filename)
    if not document:
        return None

    return DocumentRef(
        description=document.description,
        filename=document.filename,
        name=document.name,
    )
