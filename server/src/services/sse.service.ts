import type { Response } from "express";

// Map<userId → Set<Response>> — one user can have multiple browser tabs open
const clients = new Map<string, Set<Response>>();

export function addSSEClient(userId: string, res: Response): () => void {
  if (!clients.has(userId)) clients.set(userId, new Set());
  clients.get(userId)!.add(res);

  return () => {
    clients.get(userId)?.delete(res);
    if (clients.get(userId)?.size === 0) clients.delete(userId);
  };
}

export function emitToUser(userId: string, event: string, data: unknown): void {
  const userClients = clients.get(userId);
  if (!userClients || userClients.size === 0) return;

  const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  for (const res of userClients) {
    try { res.write(payload); }
    catch { /* client disconnected */ }
  }
}

/** Broadcast to all connected users (admin use) */
export function broadcast(event: string, data: unknown): void {
  for (const [, userClients] of clients) {
    const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
    for (const res of userClients) {
      try { res.write(payload); }
      catch { /* disconnected */ }
    }
  }
}

// ── Session-scoped SSE (for AI streaming) ─────────────────────────────

const sessionClients = new Map<string, Set<Response>>();

export function addSessionSSEClient(sessionId: string, res: Response): () => void {
  if (!sessionClients.has(sessionId)) sessionClients.set(sessionId, new Set());
  sessionClients.get(sessionId)!.add(res);

  return () => {
    sessionClients.get(sessionId)?.delete(res);
    if (sessionClients.get(sessionId)?.size === 0) sessionClients.delete(sessionId);
  };
}

export function emitToSession(sessionId: string, event: string, data: unknown): void {
  const clients = sessionClients.get(sessionId);
  if (!clients || clients.size === 0) return;

  const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  for (const res of clients) {
    try { res.write(payload); }
    catch { /* client disconnected */ }
  }
}
