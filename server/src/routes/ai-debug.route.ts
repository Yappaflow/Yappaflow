/**
 * AI Debug Routes (dev only)
 *
 * Test the full AI pipeline without auth, tokens, or pre-existing data.
 * Creates sample data on the fly and runs the pipeline.
 */

import express from "express";
import { env } from "../config/env";
import { log } from "../utils/logger";
import { User } from "../models/User.model";
import { Signal } from "../models/Signal.model";
import { ChatMessage } from "../models/ChatMessage.model";
import { AISession } from "../models/AISession.model";
import { ProjectRequirement } from "../models/ProjectRequirement.model";
import { GeneratedArtifact } from "../models/GeneratedArtifact.model";
import { analyzeConversation } from "../services/conversation-analyzer.service";
import { runFullPipeline } from "../services/ai-orchestrator.service";
import { isMockMode } from "../ai/client";
import { buildFullDemoWebsite } from "./preview-renderer";

const router: express.Router = express.Router();

// ── Sample conversation data ──────────────────────────────────────────

const SAMPLE_CONVERSATIONS: Record<string, Array<{ direction: string; sender: string; text: string }>> = {
  "fashion-ecommerce": [
    { direction: "inbound", sender: "Ayse", text: "Hi, I need a website for my fashion brand. We sell premium clothing for young professionals." },
    { direction: "outbound", sender: "Agency", text: "Hi Ayse! Tell me more about your brand. What's the vibe you're going for?" },
    { direction: "inbound", sender: "Ayse", text: "Think bold, modern, dark aesthetic. Like Zara meets a high-end streetwear brand. I want something that really stands out." },
    { direction: "outbound", sender: "Agency", text: "Love that direction! Do you want a full e-commerce store or more of a brand showcase?" },
    { direction: "inbound", sender: "Ayse", text: "Full e-commerce. We need product pages, a collection page, shopping cart, the works. Maybe 50 products to start." },
    { direction: "outbound", sender: "Agency", text: "Got it. Any preference on the platform? Shopify, custom build?" },
    { direction: "inbound", sender: "Ayse", text: "Shopify would be great. I've heard it's easier to manage inventory. But I want it to look premium, not like a template." },
    { direction: "outbound", sender: "Agency", text: "Absolutely. What about timeline and budget?" },
    { direction: "inbound", sender: "Ayse", text: "I'd like it done in about 3 weeks. Budget is flexible — I want quality over savings." },
    { direction: "inbound", sender: "Ayse", text: "Oh, and I love the look of locomotive.ca and studiofright.com if you need references. That kind of bold typography and smooth scrolling." },
  ],
  "restaurant": [
    { direction: "inbound", sender: "Mehmet", text: "Merhaba, we're opening a new restaurant in Istanbul and need a website." },
    { direction: "outbound", sender: "Agency", text: "Merhaba Mehmet! What kind of restaurant?" },
    { direction: "inbound", sender: "Mehmet", text: "Fine dining, Mediterranean cuisine. Very elegant, warm atmosphere. We want the website to reflect that." },
    { direction: "outbound", sender: "Agency", text: "Beautiful! What pages do you need?" },
    { direction: "inbound", sender: "Mehmet", text: "Home page with beautiful food photography, a menu page, reservations, about us, and contact. Maybe a small gallery too." },
    { direction: "inbound", sender: "Mehmet", text: "We need it in both Turkish and English. And it should work perfectly on mobile since most people will find us on their phones." },
    { direction: "outbound", sender: "Agency", text: "Platform preference?" },
    { direction: "inbound", sender: "Mehmet", text: "Whatever you recommend. We don't need e-commerce, just a beautiful website that makes people want to visit." },
  ],
  "tech-startup": [
    { direction: "inbound", sender: "Can", text: "Hey, we're building a SaaS product and need a landing page to start collecting signups." },
    { direction: "outbound", sender: "Agency", text: "What does your product do?" },
    { direction: "inbound", sender: "Can", text: "It's an AI-powered analytics tool for e-commerce. We help stores understand their customers better." },
    { direction: "inbound", sender: "Can", text: "I want something that looks like Stripe or Linear — dark, technical, but also clean and modern. Very developer-friendly aesthetic." },
    { direction: "outbound", sender: "Agency", text: "Sounds great. What do you need on the landing page?" },
    { direction: "inbound", sender: "Can", text: "Hero section with a big statement, feature showcase, pricing table, and a waitlist signup. Maybe some animated data visualizations." },
    { direction: "inbound", sender: "Can", text: "Custom build with React/Next.js please. We want full control. And make the animations really smooth — I want that Awwwards quality." },
  ],
};

// ── Production test conversation ──────────────────────────────────────

const PRODUCTION_CONVERSATION = [
  { direction: "inbound", sender: "Emirhan", text: "Selam, biz yeni bir e-ticaret sitesi istiyoruz. Markamiz KAIRA, premium el yapimi deri aksesuarlar satiyoruz - cantalar, cuzdanlar, kemerler." },
  { direction: "outbound", sender: "Agency", text: "Merhaba Emirhan! KAIRA icin harika bir site yapabiliriz. Bana biraz markanizin ruhundan bahseder misiniz? Hedef kitleniz kim?" },
  { direction: "inbound", sender: "Emirhan", text: "Hedef kitlemiz 28-45 yas arasi, kaliteye onem veren profesyoneller. Luks ama sade bir his istiyoruz. Minimalist ama sicak - soguk degil." },
  { direction: "outbound", sender: "Agency", text: "Anladim - warm minimalism. Ilham aldiginiz siteler var mi?" },
  { direction: "inbound", sender: "Emirhan", text: "Aesop.com cok hosuma gidiyor - o temiz, editorial tarzi. Bir de Bellroy.com - urun fotograflarinin sunumu cok iyi. Ama biz daha sicak tonlar istiyoruz, toprak renkleri." },
  { direction: "outbound", sender: "Agency", text: "Mukemmel referanslar. Hangi sayfalar lazim?" },
  { direction: "inbound", sender: "Emirhan", text: "Ana sayfa, urun listesi, urun detay, hakkimizda, iletisim. Bir de blog olsa guzel olur ama once bu 5 sayfa yeterli." },
  { direction: "outbound", sender: "Agency", text: "Urunleriniz hakkinda biraz detay verir misiniz? Kac urun var, kategoriler neler?" },
  { direction: "inbound", sender: "Emirhan", text: "Su an 24 urun var. 3 kategori: Cantalar (10), Cuzdanlar (8), Kemerler (6). Her urunde 2-3 renk secenegi var. Fiyatlar 800 TL ile 4500 TL arasi." },
  { direction: "outbound", sender: "Agency", text: "Platform tercihiniz var mi? Shopify, WordPress, custom?" },
  { direction: "inbound", sender: "Emirhan", text: "Custom istiyoruz. Shopify cok kalip gibi geliyor. Full kontrol istiyoruz. React ile yapabilir misiniz?" },
  { direction: "outbound", sender: "Agency", text: "Tabii, React/Next.js ile mukemmel bir site yapariz. Odeme altyapisi?" },
  { direction: "inbound", sender: "Emirhan", text: "Iyzico ile entegrasyon lazim. Turk kartlari icin en iyisi. Havale/EFT de olsun." },
  { direction: "outbound", sender: "Agency", text: "Animasyon ve etkilesim konusunda beklentiniz ne? Sade mi yoksa etkileyici mi?" },
  { direction: "inbound", sender: "Emirhan", text: "Kesinlikle etkileyici! Urunler scroll'da ortaya cikmali, hover'da buyumeli. Hero kismi cok etkileyici olmali - ilk 3 saniyede 'vay be' dedirtmeli. Ama performans da onemli, hizli yuklenmeli." },
  { direction: "outbound", sender: "Agency", text: "Renk paleti konusunda fikriniz var mi?" },
  { direction: "inbound", sender: "Emirhan", text: "Koyu arka plan, krem/bej tonlari yazi icin. Accent renk olarak sicak bir bakir/bronz tonu olabilir. Deri urunlerin sicakligini yansitmali." },
  { direction: "inbound", sender: "Emirhan", text: "Font konusunda serif bir display font istiyoruz - zarif ama modern. Body text icin temiz bir sans-serif." },
  { direction: "outbound", sender: "Agency", text: "Zaman cizelgeniz ve butceniz nedir?" },
  { direction: "inbound", sender: "Emirhan", text: "4 hafta icerisinde cikmak istiyoruz. Butce konusunda esnegiz - kalite onemli. Premium bir is bekliyoruz." },
  { direction: "inbound", sender: "Emirhan", text: "Bir de mobil cok onemli. Musterilerimizin %70'i mobilden geliyor. Mobilde de masaustu kadar etkileyici olmali." },
  { direction: "outbound", sender: "Agency", text: "Harika, tum detaylari aldim. Hemen calisma yapip size donecegiz!" },
];

// ── POST /ai/debug/production-test — Full production flow simulation ──

router.post("/production-test", async (_req, res): Promise<void> => {
  if (env.nodeEnv === "production") {
    res.status(403).json({ error: "Debug routes disabled in production" });
    return;
  }

  log("\n========================================");
  log("  YAPPAFLOW AI ENGINE — PRODUCTION TEST");
  log("========================================\n");
  log("[PROD TEST] Simulating real production flow...");
  log("[PROD TEST] Scenario: KAIRA — Premium leather accessories e-commerce");
  log("[PROD TEST] Platform: Custom (React/Next.js)");
  log("[PROD TEST] Conversation: 22 messages (Turkish/English mix)\n");

  try {
    // Step 1: Get or create test agency user
    let testUser = await User.findOne({ email: "ai-debug@yappaflow.test" });
    if (!testUser) {
      testUser = await User.create({
        email: "ai-debug@yappaflow.test",
        name: "AI Production Test",
        authProvider: "email",
        passwordHash: "debug-no-login",
      });
    }
    const agencyId = testUser._id.toString();

    // Step 2: Simulate incoming WhatsApp signal
    log("[STEP 1/5] Receiving WhatsApp signal from client...");
    const signal = await Signal.create({
      agencyId,
      platform: "whatsapp",
      sender: "+905321234567",
      senderName: "Emirhan (KAIRA)",
      preview: PRODUCTION_CONVERSATION[0].text.slice(0, 100),
      isOnDashboard: true,
      status: "new",
    });
    const signalId = signal._id.toString();
    log(`           Signal created: ${signalId}`);

    // Step 3: Store conversation messages
    log("[STEP 2/5] Storing conversation messages...");
    const now = Date.now();
    for (let i = 0; i < PRODUCTION_CONVERSATION.length; i++) {
      await ChatMessage.create({
        agencyId,
        signalId,
        platform: "whatsapp",
        direction: PRODUCTION_CONVERSATION[i].direction,
        senderName: PRODUCTION_CONVERSATION[i].sender,
        senderHandle: PRODUCTION_CONVERSATION[i].sender.toLowerCase(),
        text: PRODUCTION_CONVERSATION[i].text,
        messageType: "text",
        externalId: `prod_${signalId}_${i}_${Date.now()}`,
        timestamp: new Date(now + i * 120_000),
      });
    }
    log(`           ${PRODUCTION_CONVERSATION.length} messages stored`);

    // Step 4: Run AI pipeline
    log("[STEP 3/5] Running AI pipeline (analyze → plan → generate)...");
    log("           Phase 1: Analyzing conversation...");
    const result = await runFullPipeline(signalId, agencyId);
    log("           Pipeline complete!");

    // Step 5: Build response
    log("[STEP 4/5] Preparing results...\n");

    const sessionId = result.session?._id?.toString();
    const previewUrl = `http://localhost:${env.port}/ai/debug/preview/${sessionId}`;

    log("========================================");
    log("  RESULTS");
    log("========================================");
    log(`  Session:    ${sessionId}`);
    log(`  Status:     ${(result.session as any)?.status}`);
    log(`  Project:    ${(result.requirement as any)?.projectType} (${(result.requirement as any)?.platformPreference})`);
    log(`  Confidence: ${((result.requirement as any)?.confidence * 100).toFixed(0)}%`);
    log(`  Brand:      ${(result.requirement as any)?.brandEssence}`);
    log(`  Artifacts:  ${result.artifacts?.length || 0} files generated`);
    log(`  Preview:    ${previewUrl}`);
    log("========================================\n");

    log("[STEP 5/5] Open preview in browser:");
    log(`           ${previewUrl}\n`);

    res.json({
      success: true,
      mockMode: isMockMode(),
      scenario: "KAIRA — Premium leather accessories e-commerce",
      conversation: {
        messages: PRODUCTION_CONVERSATION.length,
        language: "Turkish (bilingual)",
        client: "Emirhan",
        brand: "KAIRA",
      },
      pipeline: {
        sessionId,
        phase: (result.session as any)?.phase,
        status: (result.session as any)?.status,
        usage: (result.session as any)?.usage,
      },
      analysis: {
        projectType: (result.requirement as any)?.projectType,
        platform: (result.requirement as any)?.platformPreference,
        confidence: (result.requirement as any)?.confidence,
        brandEssence: (result.requirement as any)?.brandEssence,
        mood: (result.requirement as any)?.designSystem?.mood,
        animationStyle: (result.requirement as any)?.designSystem?.animationStyle,
        displayFont: (result.requirement as any)?.designSystem?.typography?.displayFont,
        bodyFont: (result.requirement as any)?.designSystem?.typography?.bodyFont,
        accentColor: (result.requirement as any)?.designSystem?.colorPalette?.accent,
        pages: (result.requirement as any)?.contentRequirements?.pages,
        features: (result.requirement as any)?.contentRequirements?.features,
      },
      artifacts: result.artifacts?.map((a: any) => ({
        filePath: a.filePath,
        language: a.language,
        purpose: a.purpose,
        size: `${(a.content?.length / 1024).toFixed(1)}KB`,
      })),
      project: result.project ? {
        id: result.project._id.toString(),
        name: (result.project as any).name,
        platform: (result.project as any).platform,
        phase: (result.project as any).phase,
      } : null,
      preview: previewUrl,
    });
  } catch (err) {
    log(`[PROD TEST] FAILED: ${(err as Error).message}`);
    res.status(500).json({ success: false, error: (err as Error).message });
  }
});

// ── POST /ai/debug/test — Quick test with sample data ─────────────────

router.post("/test", async (req, res): Promise<void> => {
  if (env.nodeEnv === "production") {
    res.status(403).json({ error: "Debug routes disabled in production" });
    return;
  }

  const scenario = (req.body?.scenario as string) || "fashion-ecommerce";
  const mode = (req.body?.mode as string) || "analyze"; // "analyze" or "full"
  const conversation = SAMPLE_CONVERSATIONS[scenario];

  if (!conversation) {
    res.status(400).json({
      error: `Unknown scenario: ${scenario}`,
      available: Object.keys(SAMPLE_CONVERSATIONS),
    });
    return;
  }

  log(`\n🧪 [AI DEBUG] Starting test — scenario: ${scenario}, mode: ${mode}, mock: ${isMockMode()}`);

  try {
    // 1. Get or create a test user
    let testUser = await User.findOne({ email: "ai-debug@yappaflow.test" });
    if (!testUser) {
      testUser = await User.create({
        email: "ai-debug@yappaflow.test",
        name: "AI Debug User",
        authProvider: "email",
        passwordHash: "debug-no-login",
      });
      log("[AI DEBUG] Created test user");
    }
    const agencyId = testUser._id.toString();

    // 2. Create a test signal
    const signal = await Signal.create({
      agencyId,
      platform: "whatsapp",
      sender: "+905551234567",
      senderName: conversation[0].sender,
      preview: conversation[0].text.slice(0, 100),
      isOnDashboard: true,
      status: "new",
    });
    const signalId = signal._id.toString();
    log(`[AI DEBUG] Created signal: ${signalId}`);

    // 3. Create chat messages
    const now = Date.now();
    for (let i = 0; i < conversation.length; i++) {
      await ChatMessage.create({
        agencyId,
        signalId,
        platform: "whatsapp",
        direction: conversation[i].direction,
        senderName: conversation[i].sender,
        senderHandle: conversation[i].sender.toLowerCase(),
        text: conversation[i].text,
        messageType: "text",
        externalId: `debug_${signalId}_${i}_${Date.now()}`,
        timestamp: new Date(now + i * 60_000), // 1 min apart
      });
    }
    log(`[AI DEBUG] Created ${conversation.length} chat messages`);

    // 4. Run the AI
    if (mode === "full") {
      log("[AI DEBUG] Running full pipeline (analyze → plan → generate)...");
      const result = await runFullPipeline(signalId, agencyId);

      res.json({
        success: true,
        mockMode: isMockMode(),
        scenario,
        signalId,
        session: {
          id: result.session?._id?.toString(),
          phase: (result.session as any)?.phase,
          status: (result.session as any)?.status,
          usage: (result.session as any)?.usage,
        },
        requirement: result.requirement ? {
          id: result.requirement._id.toString(),
          projectType: (result.requirement as any).projectType,
          platform: (result.requirement as any).platformPreference,
          confidence: (result.requirement as any).confidence,
          brandEssence: (result.requirement as any).brandEssence,
          designSystem: (result.requirement as any).designSystem,
        } : null,
        artifacts: result.artifacts?.map((a: any) => ({
          filePath: a.filePath,
          language: a.language,
          purpose: a.purpose,
          contentLength: a.content?.length,
        })),
        project: result.project ? {
          id: result.project._id.toString(),
          name: (result.project as any).name,
          platform: (result.project as any).platform,
          phase: (result.project as any).phase,
        } : null,
      });
    } else {
      log("[AI DEBUG] Running analysis only...");
      const result = await analyzeConversation(signalId, agencyId);

      res.json({
        success: true,
        mockMode: isMockMode(),
        scenario,
        signalId,
        session: {
          id: result.session?._id?.toString(),
          phase: (result.session as any)?.phase,
          status: (result.session as any)?.status,
        },
        requirement: result.requirement ? {
          id: result.requirement._id.toString(),
          projectType: (result.requirement as any).projectType,
          platform: (result.requirement as any).platformPreference,
          confidence: (result.requirement as any).confidence,
          brandEssence: (result.requirement as any).brandEssence,
          signatureMoment: (result.requirement as any).signatureMoment,
          designSystem: (result.requirement as any).designSystem,
          contentRequirements: (result.requirement as any).contentRequirements,
        } : null,
      });
    }
  } catch (err) {
    log(`[AI DEBUG] Error: ${(err as Error).message}`);
    res.status(500).json({
      success: false,
      error: (err as Error).message,
      mockMode: isMockMode(),
    });
  }
});

// ── GET /ai/debug/sessions — List recent AI sessions ──────────────────

router.get("/sessions", async (_req, res): Promise<void> => {
  if (env.nodeEnv === "production") {
    res.status(403).json({ error: "Debug routes disabled in production" });
    return;
  }

  const sessions = await AISession.find()
    .sort({ createdAt: -1 })
    .limit(10)
    .lean();

  res.json(sessions.map((s: any) => ({
    id: s._id.toString(),
    phase: s.phase,
    status: s.status,
    signalId: s.signalId?.toString(),
    requirementId: s.requirementId?.toString(),
    usage: s.usage,
    error: s.error,
    createdAt: s.createdAt,
  })));
});

// ── GET /ai/debug/artifacts/:sessionId — View generated code ──────────

router.get("/artifacts/:sessionId", async (req, res): Promise<void> => {
  if (env.nodeEnv === "production") {
    res.status(403).json({ error: "Debug routes disabled in production" });
    return;
  }

  const artifacts = await GeneratedArtifact.find({ sessionId: req.params.sessionId })
    .sort({ filePath: 1 })
    .lean();

  res.json(artifacts.map((a: any) => ({
    id: a._id.toString(),
    filePath: a.filePath,
    language: a.language,
    purpose: a.purpose,
    platform: a.platform,
    contentLength: a.content?.length,
    contentPreview: a.content?.slice(0, 200) + "...",
  })));
});

// ── GET /ai/debug/artifact/:id — View full generated file ─────────────

router.get("/artifact/:id", async (req, res): Promise<void> => {
  if (env.nodeEnv === "production") {
    res.status(403).json({ error: "Debug routes disabled in production" });
    return;
  }

  const artifact = await GeneratedArtifact.findById(req.params.id).lean();
  if (!artifact) {
    res.status(404).json({ error: "Artifact not found" });
    return;
  }

  res.json({
    filePath: (artifact as any).filePath,
    language: (artifact as any).language,
    platform: (artifact as any).platform,
    content: (artifact as any).content,
  });
});

// ── GET /ai/debug/preview/:sessionId — Full demo website preview ──────

router.get("/preview/:sessionId", async (req, res): Promise<void> => {
  if (env.nodeEnv === "production") {
    res.status(403).json({ error: "Debug routes disabled in production" });
    return;
  }

  const sessionId = req.params.sessionId;
  const session = await AISession.findById(sessionId).lean();
  if (!session) { res.status(404).json({ error: "Session not found" }); return; }

  const requirement = (session as any)?.requirementId
    ? await ProjectRequirement.findOne({ _id: (session as any).requirementId }).lean()
    : null;

  if (!requirement) {
    res.status(404).json({ error: "No requirement found. Run the pipeline first." });
    return;
  }

  const ds = (requirement as any)?.designSystem;
  const req_ = requirement as any;

  const html = buildFullDemoWebsite(ds, req_);
  res.setHeader("Content-Type", "text/html");
  res.send(html);
});

// buildFullDemoWebsite imported from ./preview-renderer.ts

// (buildFullDemoWebsite is now imported from ./preview-renderer.ts)
// ── REMOVED: old inline HTML template (300+ lines) ──

// ── DELETE /ai/debug/cleanup — Remove all test data ───────────────────

router.delete("/cleanup", async (_req, res): Promise<void> => {
  if (env.nodeEnv === "production") {
    res.status(403).json({ error: "Debug routes disabled in production" });
    return;
  }

  const testUser = await User.findOne({ email: "ai-debug@yappaflow.test" });
  if (!testUser) {
    res.json({ message: "No test data to clean up" });
    return;
  }

  const agencyId = testUser._id;
  const [sessions, requirements, artifacts, signals, messages] = await Promise.all([
    AISession.deleteMany({ agencyId }),
    ProjectRequirement.deleteMany({ agencyId }),
    GeneratedArtifact.deleteMany({ agencyId }),
    Signal.deleteMany({ agencyId }),
    ChatMessage.deleteMany({ agencyId }),
  ]);

  res.json({
    cleaned: {
      sessions: sessions.deletedCount,
      requirements: requirements.deletedCount,
      artifacts: artifacts.deletedCount,
      signals: signals.deletedCount,
      messages: messages.deletedCount,
    },
  });
});

export default router;
