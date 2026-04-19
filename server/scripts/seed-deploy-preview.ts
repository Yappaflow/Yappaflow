/**
 * One-shot dev seed for Deploy Hub preview testing.
 * Creates a test user + chat Signal + messages + prints a JWT.
 * Run with: npm run seed:deploy-preview --workspace=server
 */
import mongoose from "mongoose";
import { v4 as uuidv4 } from "uuid";
import { connectDatabase } from "../src/config/db";
import { User } from "../src/models/User.model";
import { Signal } from "../src/models/Signal.model";
import { ChatMessage } from "../src/models/ChatMessage.model";
import { signToken } from "../src/services/jwt.service";

const CHAT: Array<{ dir: "inbound" | "outbound"; text: string }> = [
  { dir: "inbound",  text: "Hey! I run a little fashion boutique in Istanbul called Butik Mode. We make our own pieces." },
  { dir: "outbound", text: "Love the name. Are you thinking a full online store or more of a lookbook + contact site to start?" },
  { dir: "inbound",  text: "Lookbook first. I want it to feel editorial, calm. Warm colors, a little serif feel." },
  { dir: "inbound",  text: "We have ateliers in Kadikoy and Beyoglu. Made by hand, small batches only." },
  { dir: "outbound", text: "Got it — pages: Home, About, Contact. Subtle motion, no cart. Sound right?" },
  { dir: "inbound",  text: "Yes exactly. And i wanna keep 'Curated fashion for the bold' as a tagline." },
  { dir: "inbound",  text: "Target customers: women 28-45, professionals, who care about fit and fabric over trend." },
  { dir: "outbound", text: "Perfect. Any competitors I should know about?" },
  { dir: "inbound",  text: "We look at Toteme and Khaite for direction. Not those prices, but that kind of calm." },
  { dir: "inbound",  text: "Oh and: I want a 'lifetime alterations' note somewhere, that's our thing." },
];

async function main() {
  await connectDatabase();

  const EMAIL = "preview+deploy@yappaflow.test";
  let user = await User.findOne({ email: EMAIL });
  if (!user) {
    user = await User.create({
      email: EMAIL,
      name: "Preview Agency",
      authProvider: "email",
    });
  }

  const agencyId = user._id.toString();

  // Clean prior preview signals for this user to keep seed idempotent.
  const oldSignals = await Signal.find({ agencyId, sender: "Butik Mode (Preview)" });
  for (const s of oldSignals) {
    await ChatMessage.deleteMany({ signalId: s._id });
    await Signal.deleteOne({ _id: s._id });
  }

  const signal = await Signal.create({
    agencyId,
    platform:      "whatsapp",
    source:        "import",
    sender:        "Butik Mode (Preview)",
    senderName:    "Butik Mode (Preview)",
    preview:       CHAT[0].text.slice(0, 100),
    isOnDashboard: false,
    status:        "new",
    importedAt:    new Date(),
  });

  const t0 = Date.now() - CHAT.length * 60_000;
  for (let i = 0; i < CHAT.length; i++) {
    const m = CHAT[i];
    await ChatMessage.create({
      agencyId,
      signalId:     signal._id,
      platform:     "whatsapp",
      direction:    m.dir,
      senderName:   m.dir === "inbound" ? "Butik Mode (Preview)" : "Preview Agency",
      senderHandle: m.dir === "inbound" ? "+905551234567" : "+905557654321",
      text:         m.text,
      messageType:  "text",
      externalId:   `preview-${uuidv4()}`,
      timestamp:    new Date(t0 + i * 60_000),
    });
  }

  const token = signToken({ userId: agencyId, email: EMAIL });
  console.log("\n===== DEPLOY PREVIEW SEED =====");
  console.log("USER_ID  :", agencyId);
  console.log("SIGNAL_ID:", signal._id.toString());
  console.log("JWT      :", token);
  console.log("\nBrowser setup:");
  console.log(`  localStorage.setItem('yappaflow_token', '${token}'); location.href = '/en/dashboard';`);
  console.log("================================\n");

  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
