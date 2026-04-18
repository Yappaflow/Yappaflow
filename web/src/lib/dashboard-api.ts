let _apiBase: string | null = null;
function getApiBase(): string {
  if (_apiBase !== null) return _apiBase;
  const direct = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
  if (typeof window === "undefined") return direct;
  _apiBase = direct;
  return _apiBase;
}

function getToken() {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("yappaflow_token");
}

async function gql<T>(query: string, variables?: Record<string, unknown>): Promise<T> {
  const token = getToken();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10_000); // 10 s hard limit

  let res: Response;
  try {
    res = await fetch(`${getApiBase()}/graphql`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ query, variables }),
      signal: controller.signal,
    });
  } catch (err) {
    const isTimeout = err instanceof DOMException && err.name === "AbortError";
    throw new Error(
      isTimeout
        ? "Request timed out — is the API server running on port 4000?"
        : "Server offline – please start the API server."
    );
  } finally {
    clearTimeout(timeout);
  }

  const json = await res.json();
  if (json.errors?.length) throw new Error(json.errors[0].message);
  return json.data as T;
}

// ── Types ──────────────────────────────────────────────────────────────────────

export interface Signal {
  id:            string;
  platform:      "whatsapp" | "instagram" | "telegram" | "csv" | "other";
  sender:        string;
  senderName:    string;
  preview:       string;
  isOnDashboard: boolean;
  status:        "new" | "in_progress" | "converted" | "ignored";
  source?:       "webhook" | "import" | "api";
  createdAt:     string;
}

export interface Project {
  id:         string;
  name:       string;
  clientName: string;
  platform:   string;
  phase:      "listening" | "building" | "deploying" | "live";
  progress:   number;
  dueDate:    string | null;
  liveUrl:    string | null;
  notes:      string | null;
  signalId:   string | null;
  createdAt:  string;
}

export interface DashboardStats {
  totalSignals:      number;
  newSignals:        number;
  activeProjects:    number;
  liveProjects:      number;
  completedThisWeek: number;
}

// ── Signal queries ─────────────────────────────────────────────────────────────

const SIGNAL_FIELDS = `id platform sender senderName preview isOnDashboard status createdAt`;

export async function getSignals(onDashboardOnly = false) {
  const data = await gql<{ signals: Signal[] }>(
    `query Signals($onDashboardOnly: Boolean) {
      signals(onDashboardOnly: $onDashboardOnly) { ${SIGNAL_FIELDS} }
    }`,
    { onDashboardOnly }
  );
  return data.signals;
}

export async function createSignal(input: {
  platform: string; sender: string; senderName: string; preview: string;
}) {
  const data = await gql<{ createSignal: Signal }>(
    `mutation CreateSignal($input: CreateSignalInput!) {
      createSignal(input: $input) { ${SIGNAL_FIELDS} }
    }`,
    { input }
  );
  return data.createSignal;
}

export async function toggleSignalDashboard(id: string, onDashboard: boolean) {
  const data = await gql<{ toggleSignalDashboard: Signal }>(
    `mutation Toggle($id: ID!, $onDashboard: Boolean!) {
      toggleSignalDashboard(id: $id, onDashboard: $onDashboard) { ${SIGNAL_FIELDS} }
    }`,
    { id, onDashboard }
  );
  return data.toggleSignalDashboard;
}

export async function deleteSignal(id: string) {
  const data = await gql<{ deleteSignal: boolean }>(
    `mutation DeleteSignal($id: ID!) { deleteSignal(id: $id) }`,
    { id }
  );
  return data.deleteSignal;
}

// ── Project queries ────────────────────────────────────────────────────────────

const PROJECT_FIELDS = `id name clientName platform phase progress dueDate liveUrl notes signalId createdAt`;

export async function getProjects() {
  const data = await gql<{ projects: Project[] }>(
    `query { projects { ${PROJECT_FIELDS} } }`
  );
  return data.projects;
}

export async function createProject(input: {
  name: string; clientName: string; platform: string; dueDate?: string; notes?: string; signalId?: string;
}) {
  const data = await gql<{ createProject: Project }>(
    `mutation CreateProject($input: CreateProjectInput!) {
      createProject(input: $input) { ${PROJECT_FIELDS} }
    }`,
    { input }
  );
  return data.createProject;
}

export async function updateProject(id: string, input: Partial<{
  name: string; clientName: string; platform: string; phase: string;
  progress: number; dueDate: string; liveUrl: string; notes: string;
}>) {
  const data = await gql<{ updateProject: Project }>(
    `mutation UpdateProject($id: ID!, $input: UpdateProjectInput!) {
      updateProject(id: $id, input: $input) { ${PROJECT_FIELDS} }
    }`,
    { id, input }
  );
  return data.updateProject;
}

export async function deleteProject(id: string) {
  const data = await gql<{ deleteProject: boolean }>(
    `mutation DeleteProject($id: ID!) { deleteProject(id: $id) }`,
    { id }
  );
  return data.deleteProject;
}

export async function getDashboardStats() {
  const data = await gql<{ dashboardStats: DashboardStats }>(
    `query { dashboardStats { totalSignals newSignals activeProjects liveProjects completedThisWeek } }`
  );
  return data.dashboardStats;
}

// ── Platform connections ────────────────────────────────────────────────────────

export interface PlatformConnection {
  id:           string;
  platform:     "whatsapp" | "instagram" | "whatsapp_business" | "instagram_dm";
  displayPhone: string | null;
  igUsername:   string | null;
  createdAt:    string;
}

export interface ChatMessage {
  id:          string;
  signalId:    string;
  platform:    string;
  direction:   "inbound" | "outbound";
  senderName:  string;
  text:        string;
  messageType: string;
  timestamp:   string;
}

const PLATFORM_FIELDS = `id platform displayPhone igUsername createdAt`;
const CHAT_MSG_FIELDS = `id signalId platform direction senderName text messageType timestamp`;

export async function getPlatformConnections() {
  const data = await gql<{ platformConnections: PlatformConnection[] }>(
    `query { platformConnections { ${PLATFORM_FIELDS} } }`
  );
  return data.platformConnections;
}

export async function connectWhatsApp(input: { accessToken: string }) {
  const data = await gql<{ connectWhatsApp: PlatformConnection }>(
    `mutation ConnectWhatsApp($input: ConnectWhatsAppInput!) {
      connectWhatsApp(input: $input) { ${PLATFORM_FIELDS} }
    }`,
    { input }
  );
  return data.connectWhatsApp;
}

export async function connectWhatsAppEmbedded(input: {
  code: string;
  wabaId: string;
  phoneNumberId: string;
}) {
  const data = await gql<{ connectWhatsAppEmbedded: PlatformConnection }>(
    `mutation ConnectWhatsAppEmbedded($input: ConnectWhatsAppEmbeddedInput!) {
      connectWhatsAppEmbedded(input: $input) { ${PLATFORM_FIELDS} }
    }`,
    { input }
  );
  return data.connectWhatsAppEmbedded;
}

export async function connectInstagram(accessToken: string) {
  const data = await gql<{ connectInstagram: PlatformConnection }>(
    `mutation ConnectInstagram($accessToken: String!) {
      connectInstagram(accessToken: $accessToken) { ${PLATFORM_FIELDS} }
    }`,
    { accessToken }
  );
  return data.connectInstagram;
}

export async function disconnectPlatform(platform: string) {
  const data = await gql<{ disconnectPlatform: boolean }>(
    `mutation DisconnectPlatform($platform: String!) { disconnectPlatform(platform: $platform) }`,
    { platform }
  );
  return data.disconnectPlatform;
}

export async function getChatMessages(signalId: string, limit = 100) {
  const data = await gql<{ chatMessages: ChatMessage[] }>(
    `query ChatMessages($signalId: ID!, $limit: Int) {
      chatMessages(signalId: $signalId, limit: $limit) { ${CHAT_MSG_FIELDS} }
    }`,
    { signalId, limit }
  );
  return data.chatMessages;
}

export async function sendMessage(signalId: string, text: string) {
  const data = await gql<{ sendMessage: ChatMessage }>(
    `mutation SendMessage($signalId: ID!, $text: String!) {
      sendMessage(signalId: $signalId, text: $text) { ${CHAT_MSG_FIELDS} }
    }`,
    { signalId, text }
  );
  return data.sendMessage;
}

export interface ImportResult {
  platform:        string;
  signalsCreated:  number;
  messagesCreated: number;
}

export async function importPlatformMessages(platform: string): Promise<ImportResult> {
  const data = await gql<{ importPlatformMessages: ImportResult }>(
    `mutation ImportPlatformMessages($platform: String!) {
      importPlatformMessages(platform: $platform) {
        platform signalsCreated messagesCreated
      }
    }`,
    { platform }
  );
  return data.importPlatformMessages;
}

// ── Chat file import ──────────────────────────────────────────────────────────

export interface ChatImportResult {
  success:         boolean;
  signalsCreated:  number;
  messagesCreated: number;
  platform:        string;
  participants:    string[];
  encrypted:       boolean;
}

export async function uploadChatFile(
  file: File,
  ownerName?: string
): Promise<ChatImportResult> {
  const token = getToken();
  if (!token) throw new Error("Not authenticated");

  const form = new FormData();
  form.append("file", file);
  if (ownerName) form.append("ownerName", ownerName);

  const res = await fetch(`${getApiBase()}/import/chat`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: form,
  });

  const json = await res.json();
  if (!res.ok) throw new Error(json.error ?? "Import failed");
  return json;
}

// ── Chat file preview (parse without writing to DB) ───────────────────────────

export interface ChatPreview {
  platform:     string;
  chatTitle:    string;
  messageCount: number;
  participants: Array<{ name: string; messageCount: number }>;
}

/** Parse the chat file on the server and return participants + metadata so
 *  the UI can show a "which side is you?" picker before the real import. */
export async function previewChatFile(file: File): Promise<ChatPreview> {
  const token = getToken();
  if (!token) throw new Error("Not authenticated");

  const form = new FormData();
  form.append("file", file);

  const res = await fetch(`${getApiBase()}/import/chat/preview`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: form,
  });

  const json = await res.json();
  if (!res.ok) throw new Error(json.error ?? "Preview failed");
  return json;
}
