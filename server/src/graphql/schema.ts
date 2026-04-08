export const typeDefs = `#graphql
  type Query {
    health: HealthStatus!
    me: User
  }

  type Mutation {
    # Email auth
    registerWithEmail(input: EmailRegisterInput!): AuthResult!
    loginWithEmail(input: EmailLoginInput!): AuthResult!

    # WhatsApp auth — sends OTP to phone via WhatsApp
    requestWhatsappOtp(phone: String!): OtpSentResult!
    verifyWhatsappOtp(phone: String!, code: String!): AuthResult!

    # Phone verification (required after any login)
    requestPhoneVerification(phone: String!): OtpSentResult!
    verifyPhone(phone: String!, code: String!): User!

    # Logout
    logout: Boolean!
  }

  input EmailRegisterInput {
    email: String!
    password: String!
    name: String!
  }

  input EmailLoginInput {
    email: String!
    password: String!
  }

  type AuthResult {
    token: String!
    user: User!
  }

  type OtpSentResult {
    success: Boolean!
    message: String!
  }

  type User {
    id: ID!
    name: String!
    email: String
    phone: String
    phoneVerified: Boolean!
    authProvider: String!
    avatarUrl: String
    locale: String!
    createdAt: String!
  }

  type HealthStatus {
    status: String!
    timestamp: String!
    dbConnected: Boolean!
  }
`;
