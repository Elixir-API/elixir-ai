export type MessageRole = "user" | "assistant" | "system";

export interface Message {
  id: string;
  role: MessageRole;
  content: string;
  createdAt: Date;
}

export interface Conversation {
  id: string;
  title: string;
  messages: Message[];
  modelId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Model {
  id: string;
  name: string;
  description: string;
  contextLength: number;
  inputCostPer1k: number;
  outputCostPer1k: number;
  tier: "basic" | "standard" | "advanced" | "premium";
  creditsPerMessage: number;
}

export interface CreditPackage {
  id: string;
  credits: number;
  price: number;
  label: string;
  isBestSeller?: boolean;
}

export interface PremiumPlan {
  id: string;
  creditsPerMonth: number;
  price: number;
  label: string;
  perks: string[];
}

export interface UserCredits {
  balance: number;
  dailyFreeUsed: boolean;
  lastFreeReset: string;
  isPremium: boolean;
  premiumExpiresAt: string | null;
}

export interface RobloxUser {
  id: string;
  name: string;
  displayName: string;
  avatarUrl: string;
  pluginToken: string;
}

export type PluginStatus = "active" | "inactive" | "unknown";