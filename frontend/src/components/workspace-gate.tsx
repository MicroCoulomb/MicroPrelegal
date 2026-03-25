"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { DocumentWorkspace } from "@/components/document-workspace";
import { PlatformShell } from "@/components/platform-shell";
import {
  createDraft,
  fetchDraft,
  fetchDrafts,
  fetchSession,
  signOut,
  type AuthUser,
  type DraftDetail,
  type DraftSummary,
} from "@/lib/session";

export function WorkspaceGate() {
  const router = useRouter();
  const [session, setSession] = useState<AuthUser | null | undefined>(undefined);
  const [drafts, setDrafts] = useState<DraftSummary[]>([]);
  const [activeDraft, setActiveDraft] = useState<DraftDetail | null>(null);
  const [isLoadingDraft, setIsLoadingDraft] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function bootstrap() {
      try {
        const sessionResponse = await fetchSession();
        if (cancelled) {
          return;
        }

        setSession(sessionResponse.user);
        const savedDrafts = await fetchDrafts();
        if (cancelled) {
          return;
        }

        setDrafts(savedDrafts);

        const initialDraft =
          savedDrafts.length > 0 ? await fetchDraft(savedDrafts[0].id) : await createDraft();
        if (cancelled) {
          return;
        }

        setActiveDraft(initialDraft);
        if (savedDrafts.length === 0) {
          setDrafts([
            {
              id: initialDraft.id,
              isComplete: initialDraft.isComplete,
              selectedDocumentFilename: initialDraft.state.selectedDocumentFilename,
              statusNote: initialDraft.statusNote,
              title: initialDraft.title,
              updatedAt: initialDraft.updatedAt,
            },
          ]);
        }
      } catch {
        if (cancelled) {
          return;
        }

        setSession(null);
        router.replace("/login");
      }
    }

    bootstrap();
    return () => {
      cancelled = true;
    };
  }, [router]);

  async function handleCreateDraft() {
    setIsLoadingDraft(true);
    setErrorMessage(null);

    try {
      const draft = await createDraft();
      setActiveDraft(draft);
      setDrafts((current) => [
        {
          id: draft.id,
          isComplete: draft.isComplete,
          selectedDocumentFilename: draft.state.selectedDocumentFilename,
          statusNote: draft.statusNote,
          title: draft.title,
          updatedAt: draft.updatedAt,
        },
        ...current,
      ]);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Unable to create a new draft.");
    } finally {
      setIsLoadingDraft(false);
    }
  }

  async function handleSelectDraft(draftId: number) {
    if (activeDraft?.id === draftId) {
      return;
    }

    setIsLoadingDraft(true);
    setErrorMessage(null);
    try {
      setActiveDraft(await fetchDraft(draftId));
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Unable to load the saved draft.");
    } finally {
      setIsLoadingDraft(false);
    }
  }

  async function handleSignOut() {
    await signOut();
    router.push("/login");
    router.refresh();
  }

  function handleDraftSaved(draft: DraftDetail) {
    setActiveDraft(draft);
    setDrafts((current) => {
      const summary = {
        id: draft.id,
        isComplete: draft.isComplete,
        selectedDocumentFilename: draft.state.selectedDocumentFilename,
        statusNote: draft.statusNote,
        title: draft.title,
        updatedAt: draft.updatedAt,
      };
      const others = current.filter((item) => item.id !== draft.id);
      return [summary, ...others];
    });
  }

  if (session === undefined) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f3f8ff] text-sm text-[#5d6b86]">
        Loading workspace...
      </main>
    );
  }

  if (!session || !activeDraft) {
    return null;
  }

  return (
    <PlatformShell
      activeDraftId={activeDraft.id}
      drafts={drafts}
      isLoadingDraft={isLoadingDraft}
      onCreateDraft={handleCreateDraft}
      onSelectDraft={handleSelectDraft}
      onSignOut={handleSignOut}
      session={session}
    >
      <div className="space-y-4">
        {errorMessage ? (
          <p className="rounded-[1.5rem] border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {errorMessage}
          </p>
        ) : null}
        <DocumentWorkspace draft={activeDraft} onDraftSaved={handleDraftSaved} onNewDraft={handleCreateDraft} />
      </div>
    </PlatformShell>
  );
}
