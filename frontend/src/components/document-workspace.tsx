"use client";

import { useEffect, useRef, useState } from "react";
import { jsPDF } from "jspdf";
import {
  saveDraft,
  type ChatMessage,
  type DocumentRef,
  type DraftDetail,
  type DraftingState,
} from "@/lib/session";

type DraftingChatResponse = {
  assistantMessage: string;
  isComplete: boolean;
  previewContent: string;
  selectedDocument: DocumentRef | null;
  statusNote: string;
  suggestedDocument: DocumentRef | null;
};

type MarkdownBlock =
  | { type: "heading"; level: 1 | 2 | 3; content: string }
  | { type: "paragraph"; content: string }
  | { type: "list"; items: string[]; ordered: boolean };

type InlineSegment = {
  bold: boolean;
  text: string;
};

const INITIAL_ASSISTANT_MESSAGE =
  "Tell me what legal document you need. I can help with the supported documents in the current catalog and I'll guide you with follow-up questions.";
const DRAFT_DISCLAIMER =
  "Draft only. This document requires review by qualified legal counsel before signature or reliance.";

const INITIAL_STATE: DraftingState = {
  previewContent: "",
  selectedDocumentFilename: null,
  suggestedDocumentFilename: null,
};

function isDraftingChatResponse(payload: unknown): payload is DraftingChatResponse {
  return (
    typeof payload === "object" &&
    payload !== null &&
    "assistantMessage" in payload &&
    "previewContent" in payload &&
    "selectedDocument" in payload &&
    "suggestedDocument" in payload &&
    "isComplete" in payload &&
    "statusNote" in payload
  );
}

function parseMarkdownBlocks(content: string): MarkdownBlock[] {
  const lines = content.split(/\r?\n/);
  const blocks: MarkdownBlock[] = [];
  let paragraphLines: string[] = [];
  let listItems: string[] = [];
  let listOrdered = false;

  const flushParagraph = () => {
    if (paragraphLines.length === 0) {
      return;
    }

    blocks.push({
      type: "paragraph",
      content: paragraphLines.join(" ").trim(),
    });
    paragraphLines = [];
  };

  const flushList = () => {
    if (listItems.length === 0) {
      return;
    }

    blocks.push({
      type: "list",
      items: listItems,
      ordered: listOrdered,
    });
    listItems = [];
  };

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) {
      flushParagraph();
      flushList();
      continue;
    }

    const headingMatch = line.match(/^(#{1,3})\s+(.*)$/);
    if (headingMatch) {
      flushParagraph();
      flushList();
      blocks.push({
        type: "heading",
        level: headingMatch[1].length as 1 | 2 | 3,
        content: headingMatch[2].trim(),
      });
      continue;
    }

    const unorderedMatch = line.match(/^[-*]\s+(.*)$/);
    if (unorderedMatch) {
      flushParagraph();
      if (listItems.length > 0 && listOrdered) {
        flushList();
      }
      listOrdered = false;
      listItems.push(unorderedMatch[1].trim());
      continue;
    }

    const orderedMatch = line.match(/^\d+\.\s+(.*)$/);
    if (orderedMatch) {
      flushParagraph();
      if (listItems.length > 0 && !listOrdered) {
        flushList();
      }
      listOrdered = true;
      listItems.push(orderedMatch[1].trim());
      continue;
    }

    flushList();
    paragraphLines.push(line);
  }

  flushParagraph();
  flushList();
  return blocks;
}

function parseInlineSegments(content: string): InlineSegment[] {
  const segments: InlineSegment[] = [];
  const pattern = /(\*\*[^*]+\*\*)/g;
  const parts = content.split(pattern).filter(Boolean);

  for (const part of parts) {
    const boldMatch = part.match(/^\*\*(.+)\*\*$/);
    if (boldMatch) {
      segments.push({ bold: true, text: boldMatch[1] });
      continue;
    }
    segments.push({ bold: false, text: part });
  }

  return segments;
}

function renderInlineContent(content: string) {
  return parseInlineSegments(content).map((segment, index) =>
    segment.bold ? <strong key={`${segment.text}-${index}`}>{segment.text}</strong> : <span key={`${segment.text}-${index}`}>{segment.text}</span>,
  );
}

function MarkdownPreview({ content }: { content: string }) {
  const blocks = parseMarkdownBlocks(content);

  return (
    <div className="mt-5 space-y-5 text-stone-700">
      {blocks.map((block, index) => {
        if (block.type === "heading") {
          if (block.level === 1) {
            return (
              <h1
                key={`heading-${index}`}
                className="font-[family-name:var(--font-document)] text-4xl leading-tight text-stone-950"
              >
                {renderInlineContent(block.content)}
              </h1>
            );
          }

          if (block.level === 2) {
            return (
              <h2
                key={`heading-${index}`}
                className="border-b border-stone-200 pb-2 font-[family-name:var(--font-document)] text-2xl leading-tight text-stone-900"
              >
                {renderInlineContent(block.content)}
              </h2>
            );
          }

          return (
            <h3
              key={`heading-${index}`}
              className="font-[family-name:var(--font-document)] text-xl leading-tight text-stone-900"
            >
              {renderInlineContent(block.content)}
            </h3>
          );
        }

        if (block.type === "list") {
          const ListTag = block.ordered ? "ol" : "ul";
          return (
            <ListTag
              key={`list-${index}`}
              className={`space-y-2 pl-6 text-[15px] leading-7 text-stone-700 ${
                block.ordered ? "list-decimal" : "list-disc"
              }`}
            >
              {block.items.map((item) => (
                <li key={item}>{renderInlineContent(item)}</li>
              ))}
            </ListTag>
          );
        }

        return (
          <p key={`paragraph-${index}`} className="text-[15px] leading-8 text-stone-700">
            {renderInlineContent(block.content)}
          </p>
        );
      })}
    </div>
  );
}

export function DocumentWorkspace({
  draft,
  onDraftSaved,
  onNewDraft,
}: {
  draft: DraftDetail;
  onDraftSaved: (draft: DraftDetail) => void;
  onNewDraft: () => Promise<void> | void;
}) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [composerValue, setComposerValue] = useState("");
  const [state, setState] = useState<DraftingState>(INITIAL_STATE);
  const [selectedDocument, setSelectedDocument] = useState<DocumentRef | null>(null);
  const [suggestedDocument, setSuggestedDocument] = useState<DocumentRef | null>(null);
  const [statusNote, setStatusNote] = useState("Describe the document you need to start drafting.");
  const [isComplete, setIsComplete] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const composerRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    setMessages(
      draft.messages.length > 0 ? draft.messages : [{ role: "assistant", content: INITIAL_ASSISTANT_MESSAGE }],
    );
    setState(
      draft.messages.length > 0
        ? draft.state
        : {
            ...draft.state,
            previewContent: draft.previewContent,
          },
    );
    setSelectedDocument(draft.selectedDocument);
    setSuggestedDocument(draft.suggestedDocument);
    setStatusNote(draft.statusNote);
    setIsComplete(draft.isComplete);
    setComposerValue("");
    setErrorMessage(null);
  }, [draft]);

  useEffect(() => {
    if (isSending) {
      return;
    }

    const lastMessage = messages.at(-1);
    if (lastMessage?.role !== "assistant") {
      return;
    }

    requestAnimationFrame(() => {
      composerRef.current?.focus();
    });
  }, [isSending, messages]);

  async function sendMessage(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const userMessage = composerValue.trim();
    if (!userMessage || isSending) {
      return;
    }

    const previousMessages = messages;
    const nextMessages: ChatMessage[] = [...previousMessages, { role: "user", content: userMessage }];
    setComposerValue("");
    setErrorMessage(null);
    setMessages(nextMessages);
    setIsSending(true);

    try {
      const response = await fetch("/api/drafting/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          messages: nextMessages,
          state,
        }),
      });

      const payload: unknown = await response.json();
      if (!response.ok || !isDraftingChatResponse(payload)) {
        const detail =
          typeof payload === "object" && payload !== null && "detail" in payload
            ? String(payload.detail)
            : "Unable to generate the next drafting step.";
        throw new Error(detail);
      }

      const savedMessages: ChatMessage[] = [
        ...nextMessages,
        { role: "assistant", content: payload.assistantMessage },
      ];
      const nextState = {
        previewContent: payload.previewContent,
        selectedDocumentFilename: payload.selectedDocument?.filename ?? null,
        suggestedDocumentFilename: payload.suggestedDocument?.filename ?? null,
      };

      setState(nextState);
      setSelectedDocument(payload.selectedDocument);
      setSuggestedDocument(payload.suggestedDocument);
      setStatusNote(payload.statusNote);
      setIsComplete(payload.isComplete);
      setMessages(savedMessages);

      const savedDraft = await saveDraft(draft.id, {
        isComplete: payload.isComplete,
        messages: savedMessages,
        previewContent: payload.previewContent,
        state: nextState,
        statusNote: payload.statusNote,
      });
      onDraftSaved(savedDraft);
    } catch (error) {
      setMessages(previousMessages);
      setComposerValue(userMessage);
      setErrorMessage(error instanceof Error ? error.message : "Unable to generate the next drafting step.");
    } finally {
      setIsSending(false);
    }
  }

  function handleComposerKeyDown(event: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key !== "Enter" || event.shiftKey) {
      return;
    }

    event.preventDefault();
    event.currentTarget.form?.requestSubmit();
  }

  async function downloadDocument() {
    if (isExporting || !state.previewContent.trim()) {
      return;
    }

    setIsExporting(true);

    try {
      const pdf = new jsPDF({
        format: "a4",
        orientation: "portrait",
        unit: "pt",
      });
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 40;
      const contentWidth = pageWidth - margin * 2;
      let y = margin;

      const ensureSpace = (requiredHeight: number) => {
        if (y + requiredHeight <= pageHeight - margin) {
          return;
        }

        pdf.addPage();
        y = margin;
      };

      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(9);
      pdf.setTextColor(180, 83, 9);
      pdf.text("MICROPRELEGAL DRAFT", margin, y);
      y += 16;
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(9);
      pdf.setTextColor(120, 113, 108);
      const disclaimerLines = pdf.splitTextToSize(DRAFT_DISCLAIMER, contentWidth);
      for (const line of disclaimerLines) {
        pdf.text(line, margin, y);
        y += 12;
      }
      y += 8;

      const blocks = parseMarkdownBlocks(state.previewContent);
      const fileBase =
        selectedDocument?.name
          ?.toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-|-$/g, "") || "draft-document";

      for (const block of blocks) {
        if (block.type === "heading") {
          const size = block.level === 1 ? 22 : block.level === 2 ? 16 : 13;
          const lineHeight = block.level === 1 ? 28 : 20;
          pdf.setFont("times", "bold");
          pdf.setFontSize(size);
          pdf.setTextColor(28, 25, 23);
          const lines = pdf.splitTextToSize(block.content.replace(/\*\*(.+?)\*\*/g, "$1"), contentWidth);
          ensureSpace(lines.length * lineHeight + 10);
          for (const line of lines) {
            pdf.text(line, margin, y);
            y += lineHeight;
          }
          y += 6;
          continue;
        }

        if (block.type === "list") {
          pdf.setFont("helvetica", "normal");
          pdf.setFontSize(11);
          pdf.setTextColor(68, 64, 60);
          for (const [index, item] of block.items.entries()) {
            const prefix = block.ordered ? `${index + 1}.` : "-";
            const lines = pdf.splitTextToSize(
              `${prefix} ${item.replace(/\*\*(.+?)\*\*/g, "$1")}`,
              contentWidth - 14,
            );
            ensureSpace(lines.length * 16 + 4);
            for (const line of lines) {
              pdf.text(line, margin + 14, y);
              y += 16;
            }
            y += 2;
          }
          y += 6;
          continue;
        }

        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(11);
        pdf.setTextColor(68, 64, 60);
        const lines = pdf.splitTextToSize(block.content.replace(/\*\*(.+?)\*\*/g, "$1"), contentWidth);
        ensureSpace(lines.length * 16 + 8);
        for (const line of lines) {
          pdf.text(line, margin, y);
          y += 16;
        }
        y += 8;
      }

      ensureSpace(24);
      pdf.setDrawColor(231, 229, 228);
      pdf.line(margin, y, pageWidth - margin, y);
      y += 16;
      pdf.setFont("helvetica", "italic");
      pdf.setFontSize(9);
      pdf.setTextColor(120, 113, 108);
      const footerLines = pdf.splitTextToSize(DRAFT_DISCLAIMER, contentWidth);
      for (const line of footerLines) {
        pdf.text(line, margin, y);
        y += 12;
      }

      pdf.save(`${fileBase}.pdf`);
    } finally {
      setIsExporting(false);
    }
  }

  const previewPlaceholder = selectedDocument
    ? `# ${selectedDocument.name}\n\nDraft preview will appear here as the assistant collects details.`
    : "# Supported document preview\n\nNo document selected yet. Ask for a supported agreement and the assistant will choose or suggest the closest supported template.";

  const previewContent = state.previewContent || previewPlaceholder;

  return (
    <section className="grid items-stretch gap-6 lg:grid-cols-[minmax(0,1.02fr)_minmax(0,1.38fr)]">
      <section className="flex flex-col rounded-[2rem] border border-stone-200/80 bg-white/90 p-6 shadow-[0_24px_80px_rgba(120,53,15,0.12)] backdrop-blur lg:h-[calc(100vh-12rem)]">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-stone-500">
              Active draft
            </p>
            <h2 className="mt-2 text-2xl font-semibold text-stone-950">{draft.title}</h2>
          </div>
          <button
            className="rounded-full border border-stone-300 bg-white px-4 py-2 text-sm font-semibold text-stone-700 transition hover:border-stone-500"
            onClick={() => void onNewDraft()}
            type="button"
          >
            Start new draft
          </button>
        </div>

        <div className="flex min-h-0 flex-1 flex-col rounded-[1.5rem] border border-stone-200 bg-stone-50 p-4">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold uppercase tracking-[0.2em] text-stone-500">
                {selectedDocument ? selectedDocument.name : "Drafting conversation"}
              </h2>
              <p className="mt-1 text-xs text-stone-500">
                {suggestedDocument
                  ? `Suggested fallback: ${suggestedDocument.name}`
                  : isSending
                    ? "Assistant is drafting..."
                    : statusNote}
              </p>
            </div>
            <div
              className={`rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] ${
                isComplete ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"
              }`}
            >
              {isComplete ? "Draft ready" : "In progress"}
            </div>
          </div>

          <div className="mb-4 rounded-[1.25rem] border border-[#f3dba5] bg-[#fff8e6] px-4 py-3 text-sm leading-6 text-[#77520c]">
            {DRAFT_DISCLAIMER}
          </div>

          <div className="min-h-0 flex-1 space-y-3 overflow-y-auto pr-1">
            {messages.map((message, index) => (
              <article
                key={`${message.role}-${index}`}
                className={`rounded-[1.5rem] px-4 py-3 text-sm leading-6 shadow-sm ${
                  message.role === "assistant"
                    ? "mr-6 border border-stone-200 bg-white text-stone-700"
                    : "ml-6 bg-[#032147] text-white"
                }`}
              >
                <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.22em] opacity-70">
                  {message.role === "assistant" ? "Assistant" : "You"}
                </p>
                <p>{message.content}</p>
              </article>
            ))}
          </div>

          <form className="mt-4 shrink-0 space-y-3" onSubmit={sendMessage}>
            <label className="block">
              <span className="sr-only">Message</span>
              <textarea
                ref={composerRef}
                className="min-h-20 w-full rounded-[1.5rem] border border-stone-300 bg-white px-4 py-3 text-sm text-stone-900 outline-none transition focus:border-stone-600 focus:ring-4 focus:ring-amber-100"
                disabled={isSending}
                onChange={(event) => setComposerValue(event.target.value)}
                onKeyDown={handleComposerKeyDown}
                placeholder="Example: I need a pilot agreement for a 60-day trial of our software."
                value={composerValue}
              />
            </label>

            {errorMessage ? (
              <p className="rounded-[1.25rem] border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {errorMessage}
              </p>
            ) : null}

            <div className="flex items-center justify-between gap-4">
              <p className="text-xs leading-5 text-stone-500">{`${messages.length} messages`}</p>
              <button
                className="rounded-full bg-[#753991] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#62307a] disabled:cursor-not-allowed disabled:bg-[#9f7bb4]"
                disabled={isSending || !composerValue.trim()}
                type="submit"
              >
                {isSending ? "Sending..." : "Send"}
              </button>
            </div>
          </form>
        </div>
      </section>

      <section className="flex min-h-0 flex-col overflow-hidden rounded-[2rem] border border-stone-200/80 bg-[linear-gradient(180deg,_#f7f3ec_0%,_#efe6d8_100%)] shadow-[0_24px_80px_rgba(120,53,15,0.12)] lg:h-[calc(100vh-12rem)]">
        <div className="flex shrink-0 items-center justify-between border-b border-stone-200 px-6 py-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-amber-700">
              Live draft
            </p>
            <h2 className="mt-2 text-xl font-semibold text-stone-900">
              {selectedDocument ? selectedDocument.name : "Supported document preview"}
            </h2>
          </div>
          <button
            className="rounded-full bg-amber-400 px-4 py-2 text-xs font-semibold text-stone-950 transition hover:bg-amber-300 disabled:cursor-not-allowed disabled:bg-stone-200 disabled:text-stone-500"
            disabled={isExporting || !state.previewContent.trim()}
            onClick={downloadDocument}
            type="button"
          >
            {isExporting ? "Preparing..." : "Download PDF"}
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto p-6">
          <article className="mx-auto w-full max-w-5xl rounded-[1.75rem] border border-[#e7e5e4] bg-white px-6 py-8 text-[#1c1917] shadow-[0_28px_60px_rgba(28,25,23,0.08)] sm:px-8">
            <p className="rounded-full bg-[#fff8e6] px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-[#b45309]">
              Draft preview
            </p>
            <p className="mt-4 rounded-[1.25rem] border border-[#f3dba5] bg-[#fff8e6] px-4 py-3 text-sm leading-6 text-[#77520c]">
              {DRAFT_DISCLAIMER}
            </p>
            <MarkdownPreview content={previewContent} />
          </article>
        </div>
      </section>
    </section>
  );
}
