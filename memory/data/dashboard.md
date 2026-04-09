# Yappaflow: Dashboard UI/UX Architecture Guide

Hello Claude! We are now beginning the design and development phase for the **Yappaflow Dashboard** using React Native.

As a reminder, Yappaflow is a high-speed SaaS for web development agencies that listens to client requests (via chat or voice) and autonomously builds and deploys the project.

Because the backend operations are highly complex, our **number one design rule is Modern Minimalism**. The UI must feel breathable, fast, and effortless. We need to design the following core views:

## 1. The Command Center (Home/Overview)

This is the first screen the agency sees. It should not look like a traditional, cluttered analytics dashboard.

- **Active Signals:** A clean widget showing live incoming requests from WhatsApp or Instagram Business APIs.
- **Pipeline Status:** A minimalist tracker showing the status of current projects (e.g., "Listening," "Generating Code," "Deploying," "Live").
- **Quick Start Button:** A prominent, glowing or highly visible "Start Live Meeting" button that opens the voice-listening agent.

## 2. The Intake & Engine Room (The Magic UI)

This is where the core value of Yappaflow happens. When an agency starts a meeting or opens a chat, this UI activates.

- **Split Screen/Dual Pane View:**
  - _Left Side (The Input):_ A real-time transcript of the ongoing voice call, or the live chat feed from WhatsApp/Instagram.
  - _Right Side (The Output):_ A live, matrix-style visualizer or terminal-like view showing the AI actively writing the codebase or generating the CMS config in real-time as the conversation happens.
- **Action Focus:** It should feel like the user is watching magic happen. Minimal buttons, just pure real-time data flow.

## 3. The Deployment Hub

Once the AI finishes the code, the user lands here to review and ship.

- **Route Selector:** Two massive, clean cards asking: "Deploy to CMS" or "Deploy Custom."
- **CMS Route:** Clean toggles for Shopify, WordPress, Webflow, or IKAS.
- **Custom Route:** A seamless checkout-style flow for the Namecheap API (Domain search/confirm) and Hostinger API (Server confirm).
- **Success State:** A beautiful, satisfying animation when the live URL is generated.

## 4. Integrations & Agency Settings

- **API Keys:** Clean input fields for the agency to connect their Namecheap, Hostinger, WhatsApp, and Iyzico accounts.
- **Localization:** A simple toggle for Turkish (TR) and English (EN) that instantly updates the UI state via Redux.

## Directives for Next Steps:

I will be providing you with **video examples** and visual references to show the exact type of modern, minimalist animations and layouts I want for these components.

When you acknowledge this message, please confirm you understand the 4 pillars of the dashboard, and tell me you are ready to receive the visual/video examples for the **Command Center** to start generating our React Native components.
