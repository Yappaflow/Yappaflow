# Project Overview: Yappaflow (AI-Powered Web Agency SaaS)

## Mission Statement

Yappaflow is a high-speed SaaS platform for web development agencies. It automates the entire pipeline from client discovery to deployment. By "listening" to client conversations (text/voice) via AI, Yappaflow generates code in real-time and handles autonomous deployment to major CMS platforms or custom hosting.

## 1. Tech Stack

**Frontend:**

- React Native (For the main SaaS dashboard/mobile experience)
- Next.js / React (For the high-performance Landing Page)
- Redux (State Management)

**Backend & API:**

- Node.js with Express.js
- GraphQL (API Management & Data Fetching)

**Database:**

- MongoDB (Primary Database)
- Mongoose (ODM / Schema Management)

**DevOps & Infrastructure:**

- Docker & Kubernetes

---

## 2. Core Features & Data Flow

### A. Intake & Communication (The "Listening" Phase)

- **Social/Chat APIs:** Integration with WhatsApp Business and Instagram Business APIs to parse client requests.
- **Voice/Call Processing:** Real-time voice recording/listening for meetings. Use Claude to transcribe and architect the project structure _during_ the call.

### B. Project Generation (The "Building" Phase)

- Claude API (3.5 Sonnet) processes transcripts/chats into actionable code.
- AI agents generate full-stack codebases or CMS configurations.

### C. Autonomous Deployment (The "Shipping" Phase)

1. **CMS Route:** API integration for Shopify, WordPress, Webflow, and IKAS.
2. **Custom Route:** Autonomous infrastructure management via:
   - **Namecheap API:** Domain purchasing and DNS configuration.
   - **Hostinger API:** Server provisioning and hosting management.

---

## 3. Localization & Payments (Türkiye-First)

- **Target Market:** Primary: Türkiye; Secondary: Global.
- **i18n:** Bilingual (Turkish/English) handled dynamically via MongoDB-stored translation strings.
- **Payments:** \* Phase 1: **Iyzico** integration (Priority).
  - Phase 2: Stripe and PayPal for international scaling.

---

## 4. UI/UX & Landing Page Design Workflow

Yappaflow follows a **Modern Minimalist** aesthetic: white space, bold typography, and intuitive UX.
We need to create a landing page for web part of the application and Splash Screen for mobile Apps I'll send you a video to inspired for the landing page.

**Video-to-Code Workflow:**

- The developer will provide **Video Examples** of desired UI behaviors, animations, and layouts.
- Claude must analyze these visual references (or the developer's description of them) to recreate high-fidelity components in React Native/Next.js.
- **Design Goal:** Eliminate dashboard clutter; focus on a "conversational-to-code" interface.

---

## 5. Future Roadmap

- **IKAS Ecosystem:** Deep integration including a dedicated IKAS plugin for text-to-ecommerce store generation.

---

## 6. AI Assistant System Instructions

When acting as the Yappaflow Lead Engineer (Claude 3.5 Sonnet), follow these strict rules:

1. **Tech Stack Adherence:** Write code exclusively for the MERN + GraphQL + React Native/Next.js stack.
2. **Visual Analysis:** When provided with UI video descriptions or screen captures, prioritize recreating the exact motion and layout seen in those inspirations.
3. **Modular Service Architecture:** Isolate 3rd-party APIs (WhatsApp, Namecheap, Iyzico, Shopify) into separate service modules to maintain clean code.
4. **Localization-First:** Never hardcode strings. Use a localization helper that pulls from the MongoDB i18n collection.
5. **Incremental Development:** This is a complex ecosystem. Always ask: _"Should we focus on the Landing Page, the Voice Intake logic, or the Deployment API first?"_ before generating large code blocks.
