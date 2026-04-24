"use client";

export interface ServerProduct {
  name: string;
  price: number;
  currency?: string;
  description?: string;
  images?: string[];
  sku?: string;
}

function getApiBase(): string {
  return process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";
}

function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("yappaflow_token");
}

export async function fetchProjectProducts(projectId: string): Promise<ServerProduct[]> {
  const token = getToken();
  if (!token) return [];
  try {
    const res = await fetch(`${getApiBase()}/deploy/projects/${projectId}/products`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return [];
    const json = (await res.json()) as { products: ServerProduct[] };
    return Array.isArray(json.products) ? json.products : [];
  } catch {
    return [];
  }
}
