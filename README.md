# MicroPrelegal

MicroPrelegal is an MVP SaaS web app for drafting business agreements from a supported Common Paper catalog. Users sign in, start or reopen saved drafting sessions, chat with an AI assistant to gather terms, review a live draft preview, and export a working PDF for legal review.

## Product Summary

The app is designed for fast first-pass document drafting rather than final legal execution. It keeps the drafting workflow simple:

- sign up or sign in with an email and password
- create a new draft or reopen a saved draft
- chat with the assistant to select a supported agreement and fill in key terms
- review the live markdown preview
- export the current draft as a PDF

All generated output should be treated as draft material and reviewed by qualified legal counsel before use.

## Current Features

- FastAPI backend with statically built Next.js frontend served from the same container
- email/password authentication with cookie-based sessions
- reset-on-start SQLite database
- user-scoped saved drafting sessions
- autosave after successful drafting turns
- catalog-driven drafting flow for the supported templates in `catalog.json`
- unsupported-document fallback with closest supported document suggestion
- live draft preview with PDF export
- desktop-first workspace with recent draft history
- Docker-based local runtime scripts for Windows, Linux, and macOS

## Project Structure

```text
backend/
  src/app/
    main.py           FastAPI app and API routes
    db.py             SQLite bootstrap, auth, and draft persistence helpers
    drafting_chat.py  Catalog-driven LLM drafting service
    drafting.py       Drafting request and response models
    auth.py           Authentication API models
    drafts.py         Saved-draft API models
  tests/
    test_app.py       Backend API and drafting tests

frontend/
  src/app/            Next.js App Router pages
  src/components/     Auth, workspace, and platform UI components
  src/lib/            Frontend API helpers and shared client types

scripts/
  start-*.sh|ps1      Local Docker start scripts
  stop-*.sh|ps1       Local Docker stop scripts

catalog.json          Supported document catalog
templates/            Source agreement templates used by the drafting flow
Dockerfile            Full-stack build and runtime image
```

## How It Works

1. The frontend sends the current drafting messages and state to `POST /api/drafting/chat`.
2. The backend selects the best supported document from the catalog and generates the next drafting turn.
3. The frontend updates the chat and preview, then autosaves the full session for the signed-in user.
4. Users can reopen the exact saved session later in the same running server lifecycle.

The database is temporary by design. Users, sessions, and saved drafts are recreated from scratch each time the server starts.

## Running Locally

The app runs in Docker and serves the product at `http://localhost:8000`.

### Requirements

- Docker Desktop or Docker Engine
- an `OPENAI_API_KEY` in the project `.env` file

### Start

Windows:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\start-windows.ps1
```

Linux:

```bash
bash ./scripts/start-linux.sh
```

macOS:

```bash
bash ./scripts/start-mac.sh
```

The Windows script ends with:

```text
Application available at http://localhost:8000
```

### Stop

Windows:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\stop-windows.ps1
```

Linux:

```bash
bash ./scripts/stop-linux.sh
```

macOS:

```bash
bash ./scripts/stop-mac.sh
```

## Development Notes

- Python dependencies are managed with `uv`
- backend tests run with `uv run pytest` from `backend/`
- frontend production build runs with `npm run build` from `frontend/`
- the active drafting experience is the catalog-driven workspace, not the legacy NDA-only flow

## MVP Status

This repository now represents the MVP of the MicroPrelegal web application:

- authenticated users
- saved drafting sessions
- live AI-assisted document drafting
- exportable draft output
- single-container local deployment
