import sqlite3
from types import SimpleNamespace

from fastapi.testclient import TestClient

from app.config import DATABASE_PATH
from app.documents import load_supported_documents
from app.drafting import (
    ChatMessage,
    DocumentSelectionDecision,
    DraftingChatResponse,
    DraftingState,
    DraftingTurnResult,
)
from app.drafting_chat import LiteLlmDraftingChatService
from app.main import app


class StubDraftingService:
    def generate_reply(self, messages, state):
        assert messages[-1].content == "I need a pilot agreement for a 60-day trial."
        assert state.selected_document_filename is None
        return DraftingChatResponse(
            assistant_message="What product is being piloted and who are the provider and customer?",
            selected_document={
                "name": "Pilot Agreement",
                "description": "Common Paper standard pilot agreement.",
                "filename": "pilot-agreement.md",
            },
            suggested_document=None,
            preview_content="# Pilot Agreement\n\n## Parties\nProvider: [Provider]\nCustomer: [Customer]",
            is_complete=False,
            status_note="Pilot Agreement selected. More commercial details are needed.",
        )


def create_user(client: TestClient, *, name="Avery Stone", email="avery@example.com", password="password123"):
    return client.post(
        "/api/auth/signup",
        json={"name": name, "email": email, "password": password},
    )


def test_healthcheck_returns_ok():
    with TestClient(app) as client:
        response = client.get("/api/health")

    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_startup_resets_database_with_required_tables():
    with TestClient(app):
        pass

    assert DATABASE_PATH.exists()

    with sqlite3.connect(DATABASE_PATH) as connection:
        rows = connection.execute(
            "SELECT name FROM sqlite_master WHERE type = 'table' AND name IN ('users', 'sessions', 'drafts', 'draft_messages')"
        ).fetchall()

    assert {row[0] for row in rows} == {"users", "sessions", "drafts", "draft_messages"}


def test_workspace_route_falls_back_to_frontend_html_when_static_build_exists(tmp_path, monkeypatch):
    static_dir = tmp_path / "static"
    static_dir.mkdir()
    (static_dir / "index.html").write_text("<html><body>workspace shell</body></html>", encoding="utf-8")

    monkeypatch.setattr("app.main.FRONTEND_DIST_DIR", static_dir)

    with TestClient(app) as client:
        response = client.get("/workspace")

    assert response.status_code == 200
    assert "workspace shell" in response.text


def test_catalog_loader_returns_supported_documents():
    documents = load_supported_documents()

    assert len(documents) == 12
    assert any(document.filename == "mutual-nda.md" for document in documents)
    assert any(document.filename == "pilot-agreement.md" for document in documents)


def test_sign_up_creates_user_and_session_cookie():
    with TestClient(app) as client:
        response = create_user(client)

    assert response.status_code == 201
    assert response.json()["user"]["email"] == "avery@example.com"
    assert "microprelegal_session" in response.cookies


def test_sign_up_rejects_duplicate_email():
    with TestClient(app) as client:
        first = create_user(client)
        second = create_user(client)

    assert first.status_code == 201
    assert second.status_code == 409


def test_sign_in_rejects_wrong_password():
    with TestClient(app) as client:
        create_user(client)
        response = client.post(
            "/api/auth/signin",
            json={"email": "avery@example.com", "password": "wrong-pass"},
        )

    assert response.status_code == 401


def test_session_endpoint_requires_authentication():
    with TestClient(app) as client:
        response = client.get("/api/auth/session")

    assert response.status_code == 401


def test_session_endpoint_returns_current_user():
    with TestClient(app) as client:
        create_user(client)
        response = client.get("/api/auth/session")

    assert response.status_code == 200
    assert response.json() == {
        "user": {
            "id": 1,
            "name": "Avery Stone",
            "email": "avery@example.com",
        }
    }


def test_create_and_update_draft_restores_full_session():
    with TestClient(app) as client:
        create_user(client)
        created = client.post("/api/drafts")
        assert created.status_code == 201
        draft_id = created.json()["draft"]["id"]

        update = client.put(
            f"/api/drafts/{draft_id}",
            json={
                "messages": [
                    {"role": "assistant", "content": "Tell me what document you need."},
                    {"role": "user", "content": "I need a cloud service agreement."},
                    {"role": "assistant", "content": "What is the subscription period?"},
                ],
                "state": {
                    "selectedDocumentFilename": "cloud-service-agreement.md",
                    "suggestedDocumentFilename": None,
                    "previewContent": "# Cloud Service Agreement\n\nCustomer: [Customer]",
                },
                "previewContent": "# Cloud Service Agreement\n\nCustomer: [Customer]",
                "isComplete": False,
                "statusNote": "Cloud Service Agreement selected.",
            },
        )
        loaded = client.get(f"/api/drafts/{draft_id}")

    assert update.status_code == 200
    assert loaded.status_code == 200
    payload = loaded.json()["draft"]
    assert payload["selectedDocument"]["filename"] == "cloud-service-agreement.md"
    assert payload["messages"][1]["content"] == "I need a cloud service agreement."
    assert payload["previewContent"].startswith("# Cloud Service Agreement")


def test_list_drafts_only_returns_current_users_drafts():
    with TestClient(app) as first_client:
        create_user(first_client, email="first@example.com")
        first_client.post("/api/drafts")

    with TestClient(app) as second_client:
        create_user(second_client, email="second@example.com")
        second_response = second_client.get("/api/drafts")

    assert second_response.status_code == 200
    assert second_response.json() == {"drafts": []}


def test_draft_access_rejects_non_owner():
    with TestClient(app) as first_client:
        create_user(first_client, email="first@example.com")
        created = first_client.post("/api/drafts")
        draft_id = created.json()["draft"]["id"]

    with TestClient(app) as second_client:
        create_user(second_client, email="second@example.com")
        response = second_client.get(f"/api/drafts/{draft_id}")

    assert response.status_code == 404


def test_drafting_chat_returns_selected_document_preview():
    with TestClient(app) as client:
        client.app.state.drafting_chat_service = StubDraftingService()
        response = client.post(
            "/api/drafting/chat",
            json={
                "state": {
                    "selectedDocumentFilename": None,
                    "suggestedDocumentFilename": None,
                    "previewContent": "",
                },
                "messages": [
                    {
                        "role": "assistant",
                        "content": "Tell me what legal document you need.",
                    },
                    {
                        "role": "user",
                        "content": "I need a pilot agreement for a 60-day trial.",
                    },
                ],
            },
        )

    assert response.status_code == 200
    assert response.json() == {
        "assistantMessage": "What product is being piloted and who are the provider and customer?",
        "selectedDocument": {
            "name": "Pilot Agreement",
            "description": "Common Paper standard pilot agreement.",
            "filename": "pilot-agreement.md",
        },
        "suggestedDocument": None,
        "previewContent": "# Pilot Agreement\n\n## Parties\nProvider: [Provider]\nCustomer: [Customer]",
        "isComplete": False,
        "statusNote": "Pilot Agreement selected. More commercial details are needed.",
    }


def test_drafting_chat_rejects_invalid_payload():
    with TestClient(app) as client:
        response = client.post(
            "/api/drafting/chat",
            json={
                "state": {
                    "selectedDocumentFilename": None,
                    "suggestedDocumentFilename": None,
                    "previewContent": "",
                },
                "messages": [{"role": "system", "content": "invalid"}],
            },
        )

    assert response.status_code == 422


def test_litellm_service_retries_without_provider_when_api_rejects_it(monkeypatch):
    calls: list[dict] = []

    class FakeBadRequestError(Exception):
        pass

    def fake_completion(**kwargs):
        calls.append(kwargs)
        if len(calls) == 1:
            raise FakeBadRequestError("Unknown parameter: 'provider'")
        return SimpleNamespace(
            choices=[
                SimpleNamespace(
                    message=SimpleNamespace(
                        content=DraftingTurnResult(
                            assistant_message="What is the subscription period?",
                            preview_content="# Cloud Service Agreement\n\nCustomer: [Customer]",
                            is_complete=False,
                            status_note="Cloud Service Agreement selected. Commercial terms are still missing.",
                        ).model_dump_json(by_alias=True)
                    )
                )
            ]
        )

    monkeypatch.setattr("app.drafting_chat.completion", fake_completion)
    monkeypatch.setattr("app.drafting_chat.BadRequestError", FakeBadRequestError)
    monkeypatch.setattr(
        LiteLlmDraftingChatService,
        "_select_document",
        lambda self, messages, state, documents: DocumentSelectionDecision(
            assistant_message="What is the subscription period?",
            selected_document_filename="cloud-service-agreement.md",
            suggested_document_filename=None,
            should_wait_for_confirmation=False,
            status_note="Cloud Service Agreement selected.",
        ),
    )

    service = LiteLlmDraftingChatService()
    result = service.generate_reply(
        [
            ChatMessage(role="assistant", content="Tell me what document you need."),
            ChatMessage(role="user", content="I need a cloud service agreement."),
        ],
        DraftingState(selected_document_filename="cloud-service-agreement.md"),
    )

    assert result.assistant_message == "What is the subscription period?"
    assert result.selected_document is not None
    assert result.selected_document.filename == "cloud-service-agreement.md"
    assert result.preview_content.startswith("# Cloud Service Agreement")
    assert len(calls) == 2
    assert calls[0]["extra_body"] == {"provider": {"order": ["cerebras"]}}
    assert "extra_body" not in calls[1]
