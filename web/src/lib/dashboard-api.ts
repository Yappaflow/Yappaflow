const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

function getToken() {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("yappaflow_token");
}

async function gql<T>(query: string, variables?: Record<string, unknown>): Promise<T> {
  const token = getToken();
  let res: Response;
  try {
    res = await fetch(`${API_URL}/graphql`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ query, variables }),
    });
  } catch {
    throw new Error("Server offline – please start the API server.");
  }
  const json = await res.json();
  if (json.errors?.length) throw new Error(json.errors[0].message);
  return json.data as T;
}

// ── Types ──────────────────────────────────────────────────────────────────────

export interface Signal {
  id:            string;
  platform:      "whatsapp" | "instagram";
  sender:        string;
  senderName:    string;
  preview:       string;
  isOnDashboard: boolean;
  status:        "new" | "in_progress" | "converted" | "ignored";
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
  platform:     "whatsapp" | "instagram";
  displayPhone: string | null;
  igUsername:   string | null;
  createdAt:  string;
}

export interface ChatMessage {
  id:         string;
  signalId:   string;
  direction:  "inbound" | "outbound";
  text:       string;
  externalId: string;
  createdAt:  string;
}

const PLATFORM_FIELDS = `id platform displayPhone igUsername createdAt`;
const CHAT_MSG_FIELDS = `id signalId direction text externalId createdAt`;

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

export async function getChatMessages(signalId: string, limit = 50) {
  const data = await gql<{ chatMessages: ChatMessage[] }>(
    `query ChatMessages($signalId: ID!, $limit: Int) {
      chatMessages(signalId: $signalId, limit: $limit) { ${CHAT_MSG_FIELDS} }
    }`,
    { signalId, limit }
  );
  return data.chatMessages;
}
