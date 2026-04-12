export const typeDefs = `#graphql
  type Query {
    health:   HealthStatus!
    me:       User

    # Projects
    projects: [Project!]!
    project(id: ID!): Project

    # Signals — all received by this agency
    signals(onDashboardOnly: Boolean): [Signal!]!
    signal(id: ID!): Signal

    # Dashboard stats
    dashboardStats: DashboardStats!

    # Platform connections
    platformConnections: [PlatformConnection!]!

    # Chat messages for a signal thread
    chatMessages(signalId: ID!, limit: Int): [ChatMessage!]!

    # ── AI Engine ───────────────────────────────────────────────
    aiSession(id: ID!): AISession
    aiSessions(signalId: ID, projectId: ID): [AISession!]!
    projectRequirements(projectId: ID, signalId: ID): [ProjectRequirement!]!
    projectRequirement(id: ID!): ProjectRequirement
    generatedArtifacts(sessionId: ID!): [GeneratedArtifact!]!
  }

  type Mutation {
    # ── Auth ──────────────────────────────────────────────
    registerWithEmail(input: EmailRegisterInput!): AuthResult!
    loginWithEmail(input: EmailLoginInput!): AuthResult!
    requestWhatsappOtp(phone: String!): OtpSentResult!
    verifyWhatsappOtp(phone: String!, code: String!): AuthResult!
    requestPhoneVerification(phone: String!): OtpSentResult!
    verifyPhone(phone: String!, code: String!): User!
    logout: Boolean!

    # ── Projects ──────────────────────────────────────────
    createProject(input: CreateProjectInput!): Project!
    updateProject(id: ID!, input: UpdateProjectInput!): Project!
    deleteProject(id: ID!): Boolean!

    # ── Signals ───────────────────────────────────────────
    createSignal(input: CreateSignalInput!): Signal!
    toggleSignalDashboard(id: ID!, onDashboard: Boolean!): Signal!
    updateSignalStatus(id: ID!, status: SignalStatus!): Signal!
    deleteSignal(id: ID!): Boolean!

    # ── Platforms ─────────────────────────────────────────
    connectWhatsApp(input: ConnectWhatsAppInput!): PlatformConnection!
    connectWhatsAppEmbedded(input: ConnectWhatsAppEmbeddedInput!): PlatformConnection!
    connectInstagram(accessToken: String!): PlatformConnection!
    disconnectPlatform(platform: String!): Boolean!

    # ── Messaging ─────────────────────────────────────────
    sendMessage(signalId: ID!, text: String!): ChatMessage!

    # ── Import platform conversations ─────────────────────
    importPlatformMessages(platform: String!): ImportResult!

    # ── AI Engine ───────────────────────────────────────────
    analyzeConversation(signalId: ID!): AISession!
    planProject(requirementId: ID!): AISession!
    generateCode(sessionId: ID!): AISession!
    runAIPipeline(signalId: ID!): AISession!
    retryAIPhase(sessionId: ID!, phase: AIPhase!): AISession!
    cancelAISession(sessionId: ID!): AISession!
  }

  # ── Auth types ────────────────────────────────────────────────
  input EmailRegisterInput { email: String! password: String! name: String! }
  input EmailLoginInput    { email: String! password: String! }

  type AuthResult    { token: String! user: User! }
  type OtpSentResult { success: Boolean! message: String! }

  type User {
    id:            ID!
    name:          String!
    email:         String
    phone:         String
    phoneVerified: Boolean!
    authProvider:  String!
    avatarUrl:     String
    locale:        String!
    createdAt:     String!
  }

  type HealthStatus { status: String! timestamp: String! dbConnected: Boolean! }

  # ── Project types ─────────────────────────────────────────────
  type Project {
    id:         ID!
    name:       String!
    clientName: String!
    platform:   String!
    phase:      String!
    progress:   Int!
    dueDate:    String
    liveUrl:    String
    notes:      String
    signalId:   ID
    createdAt:  String!
    updatedAt:  String!
  }

  input CreateProjectInput {
    name:       String!
    clientName: String!
    platform:   String!
    dueDate:    String
    notes:      String
    signalId:   ID
  }

  input UpdateProjectInput {
    name:       String
    clientName: String
    platform:   String
    phase:      String
    progress:   Int
    dueDate:    String
    liveUrl:    String
    notes:      String
  }

  # ── Signal types ──────────────────────────────────────────────
  type Signal {
    id:            ID!
    platform:      String!
    sender:        String!
    senderName:    String!
    preview:       String!
    isOnDashboard: Boolean!
    status:        String!
    createdAt:     String!
    updatedAt:     String!
  }

  enum SignalStatus { new in_progress converted ignored }

  input CreateSignalInput {
    platform:   String!
    sender:     String!
    senderName: String!
    preview:    String!
  }

  # ── Platform connections ──────────────────────────────────────
  type PlatformConnection {
    id:           ID!
    platform:     String!
    isActive:     Boolean!
    displayPhone: String
    igUsername:   String
    createdAt:    String!
  }

  input ConnectWhatsAppInput {
    accessToken: String!
  }

  input ConnectWhatsAppEmbeddedInput {
    code: String!
    wabaId: String!
    phoneNumberId: String!
  }

  # ── Chat messages ──────────────────────────────────────────────
  type ChatMessage {
    id:           ID!
    signalId:     ID!
    platform:     String!
    direction:    String!
    senderName:   String!
    senderHandle: String!
    text:         String!
    messageType:  String!
    mediaUrl:     String
    timestamp:    String!
  }

  # ── Import result ─────────────────────────────────────────────
  type ImportResult {
    platform:        String!
    signalsCreated:  Int!
    messagesCreated: Int!
  }

  # ── Stats ─────────────────────────────────────────────────────
  type DashboardStats {
    totalSignals:    Int!
    newSignals:      Int!
    activeProjects:  Int!
    liveProjects:    Int!
    completedThisWeek: Int!
  }

  # ── AI Engine types ─────────────────────────────────────────────────
  enum AIPhase { analyzing planning generating reviewing ready failed }
  enum AISessionStatus { active completed failed cancelled }

  type AISession {
    id:            ID!
    signalId:      ID
    projectId:     ID
    requirementId: ID
    phase:         AIPhase!
    status:        AISessionStatus!
    usage:         AIUsage!
    error:         String
    createdAt:     String!
    updatedAt:     String!
  }

  type AIUsage {
    inputTokens:  Int!
    outputTokens: Int!
    totalCost:    Float!
    model:        String!
  }

  type DesignSystemColor {
    primary:    String!
    secondary:  String!
    accent:     String!
    background: String!
    text:       String!
  }

  type DesignSystemTypography {
    displayFont: String!
    bodyFont:    String!
    heroScale:   String!
    bodyScale:   String!
    tracking:    String!
  }

  type DesignSystemOutput {
    colorPalette:    DesignSystemColor
    typography:      DesignSystemTypography
    animationStyle:  String
    scrollBehavior:  String
    signatureMoment: String
    mood:            String
  }

  type DesignReqs {
    style:      String
    references: [String!]
    responsive: Boolean
    darkMode:   Boolean
  }

  type ContentReqs {
    pages:        [String!]
    features:     [String!]
    integrations: [String!]
    languages:    [String!]
  }

  type BusinessCtx {
    industry:       String
    targetAudience: String
    competitors:    [String!]
    timeline:       String
    budgetSignal:   String
  }

  type ProjectRequirement {
    id:                  ID!
    signalId:            ID
    projectType:         String!
    platformPreference:  String!
    confidence:          Float!
    designSystem:        DesignSystemOutput
    designRequirements:  DesignReqs
    contentRequirements: ContentReqs
    businessContext:     BusinessCtx
    brandEssence:        String
    visualTension:       String
    signatureMoment:     String
    createdAt:           String!
  }

  type GeneratedArtifact {
    id:       ID!
    sessionId: ID!
    filePath: String!
    content:  String!
    language: String!
    purpose:  String!
    platform: String!
    version:  Int!
    createdAt: String!
  }
`;
