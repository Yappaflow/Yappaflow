/**
 * Multi-factor authentication (MFA) — TOTP with backup codes.
 *
 * Why TOTP: universal authenticator-app support (Google Authenticator, Authy,
 * 1Password, Microsoft Authenticator, etc.), no SMS cost, no SIM-swap risk,
 * works offline. Standard is RFC 6238 — 30-second steps, 6-digit codes.
 *
 * What this module owns:
 *   1. Generating a new TOTP secret + the `otpauth://` URL + QR code data URL
 *      during enrollment. The secret is stashed in `User.mfaPendingSecret`
 *      (encrypted) until the user proves they can read it back.
 *   2. Verifying the first code → promoting pending → active, and issuing
 *      10 single-use backup codes (shown once to the user, stored bcrypt-hashed).
 *   3. Verifying a TOTP code during login, and redeeming a backup code
 *      (single-use, marks it consumed).
 *   4. Disabling MFA and regenerating backup codes (both require a valid
 *      current TOTP code).
 *
 * Security notes:
 *   - Secrets are stored encrypted-at-rest via the existing encryption.service
 *     (AES-256-GCM, per-user HKDF-derived key). Falls back to plaintext only
 *     when ENCRYPTION_MASTER_KEY is unset (dev) — production MUST have it.
 *   - Backup codes are stored as bcrypt hashes with 10 salt rounds (cheap
 *     enough to verify at login but slow enough to deter offline attacks).
 *   - A small in-memory rate limit caps verification attempts per user per
 *     15 minutes — this is a second line of defense behind the express-
 *     rate-limit on `/auth` REST routes.
 */
import { generateSecret, generateURI, verify as otpVerify } from "otplib";
import QRCode from "qrcode";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import type { IUser } from "../models/User.model";
import {
  encryptText,
  decryptText,
  isEncryptionEnabled,
} from "./encryption.service";

// ── TOTP configuration ────────────────────────────────────────────────
//
// RFC 6238 defaults: 30 s step, 6 digits, SHA-1 — what every authenticator
// app (Google Authenticator, Authy, 1Password, …) speaks natively.
// `TOTP_TOLERANCE_SEC` of 30 accepts the current 30 s window plus the one
// immediately before/after, so a phone clock ±30 s off still succeeds.
const TOTP_PERIOD_SEC    = 30;
const TOTP_TOLERANCE_SEC = 30;

const ISSUER            = "Yappaflow";
const BACKUP_CODE_COUNT = 10;
const BACKUP_CODE_LEN   = 10; // 10 chars of base32 → ~50 bits entropy each
const BCRYPT_ROUNDS     = 10;

async function verifyTotpCode(token: string, secret: string): Promise<boolean> {
  if (!/^\d{6}$/.test(token.trim())) return false;
  try {
    const res = await otpVerify({
      token:          token.trim(),
      secret,
      strategy:       "totp",
      period:         TOTP_PERIOD_SEC,
      epochTolerance: TOTP_TOLERANCE_SEC,
    });
    return res.valid === true;
  } catch {
    return false;
  }
}

// ── Rate limit (per-user, in-memory) ──────────────────────────────────
// Resets every 15 minutes. After 10 failures a user cannot verify until
// the bucket rolls over. Defense-in-depth on top of express-rate-limit.
const ATTEMPT_WINDOW_MS    = 15 * 60 * 1000;
const MAX_ATTEMPTS_PER_WIN = 10;
type Bucket = { count: number; resetAt: number };
const attemptBuckets = new Map<string, Bucket>();

function checkAndBumpAttempts(userId: string): boolean {
  const now = Date.now();
  const bucket = attemptBuckets.get(userId);
  if (!bucket || bucket.resetAt < now) {
    attemptBuckets.set(userId, { count: 1, resetAt: now + ATTEMPT_WINDOW_MS });
    return true;
  }
  if (bucket.count >= MAX_ATTEMPTS_PER_WIN) return false;
  bucket.count += 1;
  return true;
}

function resetAttempts(userId: string): void {
  attemptBuckets.delete(userId);
}

// ── Secret storage helpers ────────────────────────────────────────────
//
// Mirror the shape PlatformConnection uses for access tokens: when
// encryption is on, we keep { value, iv, keyId }; when off, value is the
// raw base32 string. Decryption tolerates both.

interface EncryptedSecret {
  value: string;
  iv?: string;
  keyId?: string;
}

function encryptSecret(secret: string, userId: string): EncryptedSecret {
  if (!isEncryptionEnabled()) return { value: secret };
  const { ciphertext, iv, encryptionKeyId } = encryptText(secret, userId);
  return { value: ciphertext, iv, keyId: encryptionKeyId };
}

function decryptSecret(stored: EncryptedSecret, userId: string): string {
  if (!stored.iv || !isEncryptionEnabled()) return stored.value;
  return decryptText(stored.value, stored.iv, userId);
}

// ── Public API ────────────────────────────────────────────────────────

export interface MfaSetupInfo {
  /** Base32 secret to display if the user can't scan the QR. */
  secret:      string;
  /** `otpauth://` URL — what the QR encodes. */
  otpauthUrl:  string;
  /** `data:image/png;base64,…` — ready to drop in an `<img src>`. */
  qrDataUrl:   string;
}

/**
 * Start enrollment: generate a fresh secret and stash it as `mfaPendingSecret`.
 * Overwrites any prior pending secret (re-running this invalidates the old QR).
 * Returns the info the UI needs to display the QR + manual secret.
 *
 * This step does NOT enable MFA — `confirmAndEnable()` does.
 */
export async function startEnrollment(user: IUser): Promise<MfaSetupInfo> {
  const secret     = generateSecret();
  const accountId  = user.email || user.phone || String(user.id);
  const otpauthUrl = generateURI({
    issuer: ISSUER,
    label:  accountId,
    secret,
    period: TOTP_PERIOD_SEC,
  });

  const enc = encryptSecret(secret, String(user.id));
  user.mfaPendingSecret      = enc.value;
  user.mfaPendingSecretIv    = enc.iv;
  user.mfaPendingSecretKeyId = enc.keyId;
  await user.save();

  const qrDataUrl = await QRCode.toDataURL(otpauthUrl, {
    errorCorrectionLevel: "M",
    margin: 1,
    width: 256,
  });

  return { secret, otpauthUrl, qrDataUrl };
}

/**
 * Finish enrollment: verify the user's first TOTP code against the
 * pending secret. On success:
 *   - promote `mfaPendingSecret` → `mfaSecret`
 *   - set `mfaEnabled = true`
 *   - generate 10 fresh backup codes (returned plaintext, stored hashed)
 *
 * Returns the plaintext backup codes — caller MUST display these once
 * and never again. Throws `MFA_NO_PENDING_ENROLLMENT` if enrollment
 * was never started, `MFA_INVALID_CODE` if the code is wrong.
 */
export async function confirmAndEnable(
  user: IUser,
  code: string
): Promise<{ backupCodes: string[] }> {
  if (!user.mfaPendingSecret) {
    throw new Error("MFA_NO_PENDING_ENROLLMENT");
  }
  if (!checkAndBumpAttempts(String(user.id))) {
    throw new Error("MFA_TOO_MANY_ATTEMPTS");
  }

  const plaintext = decryptSecret(
    {
      value: user.mfaPendingSecret,
      iv:    user.mfaPendingSecretIv,
      keyId: user.mfaPendingSecretKeyId,
    },
    String(user.id)
  );

  const ok = await verifyTotpCode(code, plaintext);
  if (!ok) throw new Error("MFA_INVALID_CODE");

  resetAttempts(String(user.id));

  // Promote pending → active.
  user.mfaSecret         = user.mfaPendingSecret;
  user.mfaSecretIv       = user.mfaPendingSecretIv;
  user.mfaSecretKeyId    = user.mfaPendingSecretKeyId;
  user.mfaPendingSecret      = undefined;
  user.mfaPendingSecretIv    = undefined;
  user.mfaPendingSecretKeyId = undefined;
  user.mfaEnabled        = true;
  user.mfaEnabledAt      = new Date();

  const backupCodes = await regenerateBackupCodesInternal(user);
  await user.save();

  return { backupCodes };
}

/**
 * Verify a TOTP code against the user's active secret. Used at login
 * (post-password) and as a confirmation step for sensitive MFA ops.
 * Returns true on success, false otherwise. Respects the per-user
 * attempt limit — returns false once the limit is hit without calling
 * `authenticator.check()`.
 */
export async function verifyTotp(user: IUser, code: string): Promise<boolean> {
  if (!user.mfaEnabled || !user.mfaSecret) return false;
  if (!checkAndBumpAttempts(String(user.id))) return false;

  const plaintext = decryptSecret(
    {
      value: user.mfaSecret,
      iv:    user.mfaSecretIv,
      keyId: user.mfaSecretKeyId,
    },
    String(user.id)
  );

  const ok = await verifyTotpCode(code, plaintext);
  if (ok) resetAttempts(String(user.id));
  return ok;
}

/**
 * Redeem a single-use backup code. On success, the code is marked
 * `used: true` (prevents replay). Returns true if consumed, false otherwise.
 *
 * Takes the plaintext the user typed and compares against each stored
 * hash. This is O(n × bcryptCost) per call — fine for n=10 codes.
 */
export async function verifyBackupCode(
  user: IUser,
  code: string
): Promise<boolean> {
  if (!user.mfaEnabled) return false;
  if (!user.mfaBackupCodes || user.mfaBackupCodes.length === 0) return false;
  if (!checkAndBumpAttempts(String(user.id))) return false;

  const normalized = code.replace(/\s|-/g, "").toUpperCase();

  for (const entry of user.mfaBackupCodes) {
    if (entry.used) continue;
    const match = await bcrypt.compare(normalized, entry.hash);
    if (match) {
      entry.used   = true;
      entry.usedAt = new Date();
      await user.save();
      resetAttempts(String(user.id));
      return true;
    }
  }
  return false;
}

/**
 * Turn MFA off. Caller must have re-verified with a valid TOTP code first
 * (enforced in the resolver). Clears all MFA state.
 */
export async function disableMfa(user: IUser): Promise<void> {
  user.mfaEnabled        = false;
  user.mfaSecret         = undefined;
  user.mfaSecretIv       = undefined;
  user.mfaSecretKeyId    = undefined;
  user.mfaPendingSecret      = undefined;
  user.mfaPendingSecretIv    = undefined;
  user.mfaPendingSecretKeyId = undefined;
  user.mfaBackupCodes    = [];
  user.mfaEnabledAt      = undefined;
  await user.save();
}

/**
 * Regenerate the backup-code set. Caller must have re-verified with a
 * valid TOTP code first (enforced in the resolver). Returns plaintext
 * codes — show once, never again.
 */
export async function regenerateBackupCodes(user: IUser): Promise<string[]> {
  const codes = await regenerateBackupCodesInternal(user);
  await user.save();
  return codes;
}

async function regenerateBackupCodesInternal(user: IUser): Promise<string[]> {
  const plain: string[] = [];
  const hashed: { hash: string; used: boolean }[] = [];
  for (let i = 0; i < BACKUP_CODE_COUNT; i++) {
    const code = generateBackupCode();
    plain.push(code);
    hashed.push({ hash: await bcrypt.hash(code, BCRYPT_ROUNDS), used: false });
  }
  user.mfaBackupCodes = hashed as IUser["mfaBackupCodes"];
  return plain.map(formatBackupCode);
}

/**
 * `XXXX-XXXX-XX` grouping is easier for humans to type. The underlying
 * base32 alphabet (A-Z, 2-7) avoids confusable chars (0/O, 1/I, etc.).
 */
function formatBackupCode(raw: string): string {
  // raw is BACKUP_CODE_LEN chars long
  return `${raw.slice(0, 4)}-${raw.slice(4, 8)}-${raw.slice(8)}`;
}

function generateBackupCode(): string {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567"; // base32 (RFC 4648)
  const bytes = crypto.randomBytes(BACKUP_CODE_LEN);
  let out = "";
  for (let i = 0; i < BACKUP_CODE_LEN; i++) {
    out += alphabet[bytes[i] % alphabet.length];
  }
  return out;
}

/**
 * Count remaining unused backup codes — the UI surfaces this so users
 * know when to regenerate.
 */
export function remainingBackupCodes(user: IUser): number {
  if (!user.mfaBackupCodes) return 0;
  return user.mfaBackupCodes.filter((c) => !c.used).length;
}
