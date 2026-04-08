export interface User {
  id: string;
  email: string;
  name: string;
  locale: "en" | "tr";
  createdAt: Date;
  updatedAt: Date;
}

export interface Project {
  id: string;
  userId: string;
  name: string;
  status: "intake" | "building" | "deploying" | "deployed" | "failed";
  platform: "shopify" | "wordpress" | "webflow" | "ikas" | "custom";
  createdAt: Date;
  updatedAt: Date;
}

export interface HealthStatus {
  status: string;
  timestamp: string;
  dbConnected: boolean;
}
