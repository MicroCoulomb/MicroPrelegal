export type AuthUser = {
  email: string;
  id: number;
  name: string;
};

export type ChatMessage = {
  content: string;
  role: "assistant" | "user";
};

export type DocumentRef = {
  description: string;
  filename: string;
  name: string;
};

export type DraftingState = {
  previewContent: string;
  selectedDocumentFilename: string | null;
  suggestedDocumentFilename: string | null;
};

export type DraftSummary = {
  id: number;
  isComplete: boolean;
  selectedDocumentFilename: string | null;
  statusNote: string;
  title: string;
  updatedAt: string;
};

export type DraftDetail = {
  id: number;
  isComplete: boolean;
  messages: ChatMessage[];
  previewContent: string;
  selectedDocument: DocumentRef | null;
  state: DraftingState;
  statusNote: string;
  suggestedDocument: DocumentRef | null;
  title: string;
  updatedAt: string;
};

type AuthSessionResponse = {
  user: AuthUser;
};

type DraftListResponse = {
  drafts: DraftSummary[];
};

type DraftDetailResponse = {
  draft: DraftDetail;
};

type JsonOptions = {
  body?: unknown;
  method?: "GET" | "POST" | "PUT";
};

async function requestJson<T>(path: string, options: JsonOptions = {}): Promise<T> {
  const response = await fetch(path, {
    method: options.method ?? "GET",
    headers: options.body ? { "Content-Type": "application/json" } : undefined,
    body: options.body ? JSON.stringify(options.body) : undefined,
    credentials: "include",
  });

  const payload = response.status === 204 ? null : ((await response.json()) as unknown);
  if (!response.ok) {
    const detail =
      typeof payload === "object" && payload !== null && "detail" in payload
        ? String(payload.detail)
        : "Request failed.";
    throw new Error(detail);
  }

  return payload as T;
}

export async function fetchSession() {
  return requestJson<AuthSessionResponse>("/api/auth/session");
}

export async function signIn(email: string, password: string) {
  return requestJson<AuthSessionResponse>("/api/auth/signin", {
    method: "POST",
    body: { email, password },
  });
}

export async function signUp(name: string, email: string, password: string) {
  return requestJson<AuthSessionResponse>("/api/auth/signup", {
    method: "POST",
    body: { email, name, password },
  });
}

export async function signOut() {
  await requestJson<void>("/api/auth/signout", { method: "POST" });
}

export async function fetchDrafts() {
  const response = await requestJson<DraftListResponse>("/api/drafts");
  return response.drafts;
}

export async function createDraft() {
  const response = await requestJson<DraftDetailResponse>("/api/drafts", { method: "POST" });
  return response.draft;
}

export async function fetchDraft(draftId: number) {
  const response = await requestJson<DraftDetailResponse>(`/api/drafts/${draftId}`);
  return response.draft;
}

export async function saveDraft(
  draftId: number,
  payload: {
    isComplete: boolean;
    messages: ChatMessage[];
    previewContent: string;
    state: DraftingState;
    statusNote: string;
  },
) {
  const response = await requestJson<DraftDetailResponse>(`/api/drafts/${draftId}`, {
    method: "PUT",
    body: payload,
  });
  return response.draft;
}
