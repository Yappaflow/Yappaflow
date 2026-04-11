import ngrok from "@ngrok/ngrok";
import { config } from "dotenv";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

// Load env from server/.env (the shared config for this monorepo)
const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(__dirname, "../server/.env") });

const SERVER_PORT  = parseInt(process.env.SERVER_PORT  || "4000", 10);
const VERIFY_TOKEN = process.env.META_WEBHOOK_VERIFY_TOKEN || "yappaflow_webhook_verify";

if (!process.env.NGROK_AUTHTOKEN) {
  console.error("\n❌  NGROK_AUTHTOKEN is not set.");
  console.error("   1. Sign up free at https://ngrok.com");
  console.error("   2. Copy your authtoken from https://dashboard.ngrok.com/get-started/your-authtoken");
  console.error("   3. Add to server/.env:  NGROK_AUTHTOKEN=your_token_here\n");
  process.exit(1);
}

console.log(`🔌 Opening ngrok tunnel to localhost:${SERVER_PORT}…`);

let listener;
try {
  listener = await ngrok.forward({
    addr:               SERVER_PORT,
    authtoken_from_env: true,         // reads NGROK_AUTHTOKEN
  });
} catch (err) {
  console.error(`\n❌  ngrok failed: ${err.message}`);
  console.error("   Check your NGROK_AUTHTOKEN is valid.\n");
  process.exit(1);
}

const url = listener.url();

console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
console.log(`🌐  Public URL:    ${url}`);
console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
console.log(`📡  Webhook URL:   ${url}/webhook`);
console.log(`🔑  Verify token:  ${VERIFY_TOKEN}`);
console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
console.log("\n👉  In Meta Developer Console → WhatsApp → Configuration:");
console.log(`    Callback URL:  ${url}/webhook`);
console.log(`    Verify token:  ${VERIFY_TOKEN}`);
console.log("\n👉  Subscribe to field: messages\n");

// Keep the process alive — ngrok closes when this exits
process.on("SIGINT",  () => ngrok.disconnect().then(() => process.exit(0)));
process.on("SIGTERM", () => ngrok.disconnect().then(() => process.exit(0)));
