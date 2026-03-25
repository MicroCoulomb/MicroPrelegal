"use client";

import type { ReactNode } from "react";
import type { AuthUser, DraftSummary } from "@/lib/session";

export function PlatformShell({
  activeDraftId,
  children,
  drafts,
  isLoadingDraft,
  onCreateDraft,
  onSelectDraft,
  onSignOut,
  session,
}: {
  activeDraftId: number | null;
  children: ReactNode;
  drafts: DraftSummary[];
  isLoadingDraft: boolean;
  onCreateDraft: () => void;
  onSelectDraft: (draftId: number) => void;
  onSignOut: () => void;
  session: AuthUser;
}) {
  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,_#f3f8ff_0%,_#f9f2ff_34%,_#fff8eb_100%)] px-4 py-6 text-[#032147] sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-[110rem] flex-col gap-6">
        <header className="rounded-[2rem] border border-white/70 bg-[linear-gradient(135deg,_rgba(255,255,255,0.94),_rgba(244,249,255,0.92))] px-6 py-5 shadow-[0_24px_70px_rgba(3,33,71,0.12)]">
          <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.34em] text-[#209dd7]">
                MicroPrelegal Platform
              </p>
              <h1 className="mt-3 text-3xl font-semibold tracking-tight text-[#032147]">
                Saved legal drafting workspace
              </h1>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-[#5d6b86]">
                Drafts stay attached to your current account for this running server session. Every
                generated agreement remains a draft and should be reviewed by legal counsel before use.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <div className="rounded-full border border-[#d5dfeb] bg-white px-4 py-2 text-sm text-[#032147]">
                {session.name} | {session.email}
              </div>
              <button
                className="rounded-full bg-[#753991] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#62307a]"
                onClick={onCreateDraft}
                type="button"
              >
                New draft
              </button>
              <button
                className="rounded-full bg-[#ecad0a] px-4 py-2 text-sm font-semibold text-[#032147] transition hover:bg-[#d89d08]"
                onClick={onSignOut}
                type="button"
              >
                Sign out
              </button>
            </div>
          </div>
        </header>

        <section className="grid gap-6 xl:grid-cols-[20rem_minmax(0,1fr)]">
          <aside className="rounded-[2rem] border border-white/70 bg-white/85 p-5 shadow-[0_20px_60px_rgba(3,33,71,0.08)] backdrop-blur">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#209dd7]">
                  Draft library
                </p>
                <h2 className="mt-2 text-xl font-semibold text-[#032147]">Your saved sessions</h2>
              </div>
              <span className="rounded-full bg-[#eef6ff] px-3 py-1 text-xs font-semibold text-[#209dd7]">
                {drafts.length}
              </span>
            </div>

            <p className="mt-4 rounded-[1.25rem] border border-[#f3dba5] bg-[#fff8e6] px-4 py-3 text-sm leading-6 text-[#77520c]">
              Draft output is for internal review and is not final legal advice.
            </p>

            <div className="mt-5 space-y-3">
              {drafts.map((draft) => (
                <button
                  key={draft.id}
                  className={`w-full rounded-[1.5rem] border px-4 py-4 text-left transition ${
                    draft.id === activeDraftId
                      ? "border-[#209dd7] bg-[#eef7ff] shadow-[0_12px_30px_rgba(32,157,215,0.12)]"
                      : "border-[#dde7f0] bg-white hover:border-[#bfd5e8] hover:bg-[#f8fbff]"
                  }`}
                  disabled={isLoadingDraft}
                  onClick={() => onSelectDraft(draft.id)}
                  type="button"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-[#032147]">{draft.title}</p>
                      <p className="mt-1 text-xs text-[#66758f]">{draft.statusNote || "Draft session"}</p>
                    </div>
                    <span
                      className={`rounded-full px-2 py-1 text-[11px] font-semibold uppercase ${
                        draft.isComplete ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"
                      }`}
                    >
                      {draft.isComplete ? "Ready" : "Drafting"}
                    </span>
                  </div>
                  <p className="mt-3 text-xs text-[#7b8ba6]">
                    Updated {new Date(draft.updatedAt).toLocaleString()}
                  </p>
                </button>
              ))}
            </div>
          </aside>

          {children}
        </section>
      </div>
    </main>
  );
}
