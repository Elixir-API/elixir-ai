import { create } from "zustand";
import { persist } from "zustand/middleware";
import { Conversation, Message, Model, UserCredits, RobloxUser, PluginStatus } from "@/types";
import { nanoid } from "nanoid";

export const AVAILABLE_MODELS: Model[] = [
  {
    id: "google/gemini-3.0-flash",
    name: "Gemini 3.0 Flash",
    description: "Fast and lightweight, great for everyday tasks",
    contextLength: 128000,
    inputCostPer1k: 0.0001,
    outputCostPer1k: 0.0002,
    tier: "basic",
    creditsPerMessage: 0.15,
  },
  {
    id: "stepfun/step-3.5",
    name: "Step 3.5",
    description: "Balanced performance for reasoning and coding",
    contextLength: 256000,
    inputCostPer1k: 0.0008,
    outputCostPer1k: 0.0016,
    tier: "standard",
    creditsPerMessage: 0.25,
  },
  {
    id: "anthropic/claude-3.5-opus",
    name: "Claude Opus 3.5",
    description: "Highly capable, great for complex tasks and analysis",
    contextLength: 200000,
    inputCostPer1k: 0.003,
    outputCostPer1k: 0.015,
    tier: "advanced",
    creditsPerMessage: 0.50,
  },
  {
    id: "anthropic/claude-sonnet-4-6",
    name: "Claude Sonnet 4.6",
    description: "Most powerful — best reasoning and intelligence",
    contextLength: 200000,
    inputCostPer1k: 0.008,
    outputCostPer1k: 0.024,
    tier: "premium",
    creditsPerMessage: 0.75,
  },
];

export const CREDIT_PACKAGES = [
  { id: "starter", credits: 5, price: 2.99, label: "Starter" },
  { id: "popular", credits: 10, price: 4.99, label: "Popular" },
  { id: "best-seller", credits: 25, price: 9.99, label: "Best Value", isBestSeller: true },
];

export const PREMIUM_PLAN = {
  id: "premium-monthly",
  creditsPerMonth: 40,
  price: 20.0,
  label: "Elixir Premium",
  perks: [
    "40 credits refreshed every month",
    "Priority processing — faster responses",
    "Access to all models including Claude Sonnet 4.6",
    "1 free daily credit on top of monthly balance",
    "Early access to new features & models",
    "Premium badge on your account",
    "Skip the queue — priority server access",
    "Priority customer support",
  ],
};

export function calculateCreditCost(model: Model, messageLength: number): number {
  const base = model.creditsPerMessage;
  let multiplier = 1.0;
  if (messageLength < 200) multiplier = 0.6;
  else if (messageLength < 800) multiplier = 1.0;
  else if (messageLength < 2000) multiplier = 1.5;
  else multiplier = 2.0;
  return parseFloat((base * multiplier).toFixed(2));
}

const DEFAULT_USER_CREDITS: UserCredits = {
  balance: 1,
  dailyFreeUsed: false,
  lastFreeReset: new Date().toISOString(),
  isPremium: false,
  premiumExpiresAt: null,
};

interface AppState {
  conversations: Conversation[];
  activeConversationId: string | null;
  selectedModel: Model;
  isLoading: boolean;
  userCredits: UserCredits;
  showShop: boolean;
  robloxUser: RobloxUser | null;
  pluginStatus: PluginStatus;

  setActiveConversation: (id: string) => void;
  createConversation: () => string;
  deleteConversation: (id: string) => void;
  addMessage: (conversationId: string, message: Omit<Message, "id" | "createdAt">) => void;
  updateConversationTitle: (id: string, title: string) => void;
  setSelectedModel: (model: Model) => void;
  setIsLoading: (loading: boolean) => void;
  deductCredits: (amount: number) => boolean;
  addCredits: (amount: number) => void;
  checkAndResetDailyFree: () => void;
  setPremium: (expiresAt: string) => void;
  setShowShop: (show: boolean) => void;
  setRobloxUser: (user: RobloxUser | null) => void;
  setPluginStatus: (status: PluginStatus) => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      conversations: [],
      activeConversationId: null,
      selectedModel: AVAILABLE_MODELS[0],
      isLoading: false,
      userCredits: DEFAULT_USER_CREDITS,
      showShop: false,
      robloxUser: null,
      pluginStatus: "unknown",

      setActiveConversation: (id) => set({ activeConversationId: id }),

      createConversation: () => {
        const id = nanoid();
        const newConversation: Conversation = {
          id,
          title: "New Conversation",
          messages: [],
          modelId: get().selectedModel.id,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        set((state) => ({
          conversations: [newConversation, ...state.conversations],
          activeConversationId: id,
        }));
        return id;
      },

      deleteConversation: (id) =>
        set((state) => ({
          conversations: state.conversations.filter((c) => c.id !== id),
          activeConversationId:
            state.activeConversationId === id ? null : state.activeConversationId,
        })),

      addMessage: (conversationId, message) =>
        set((state) => ({
          conversations: state.conversations.map((c) =>
            c.id === conversationId
              ? {
                  ...c,
                  messages: [
                    ...c.messages,
                    { ...message, id: nanoid(), createdAt: new Date() },
                  ],
                  updatedAt: new Date(),
                }
              : c
          ),
        })),

      updateConversationTitle: (id, title) =>
        set((state) => ({
          conversations: state.conversations.map((c) =>
            c.id === id ? { ...c, title } : c
          ),
        })),

      setSelectedModel: (model) => set({ selectedModel: model }),
      setIsLoading: (loading) => set({ isLoading: loading }),

      deductCredits: (amount) => {
        const { userCredits } = get();
        if (userCredits.balance < amount) return false;
        set((state) => ({
          userCredits: {
            ...state.userCredits,
            balance: parseFloat((state.userCredits.balance - amount).toFixed(2)),
          },
        }));
        return true;
      },

      addCredits: (amount) =>
        set((state) => ({
          userCredits: {
            ...state.userCredits,
            balance: parseFloat((state.userCredits.balance + amount).toFixed(2)),
          },
        })),

      checkAndResetDailyFree: () => {
        const { userCredits } = get();
        const lastReset = new Date(userCredits.lastFreeReset);
        const now = new Date();
        const isNewDay =
          now.getDate() !== lastReset.getDate() ||
          now.getMonth() !== lastReset.getMonth() ||
          now.getFullYear() !== lastReset.getFullYear();
        if (isNewDay) {
          set((state) => ({
            userCredits: {
              ...state.userCredits,
              dailyFreeUsed: false,
              lastFreeReset: now.toISOString(),
              balance: parseFloat((state.userCredits.balance + 1).toFixed(2)),
            },
          }));
        }
      },

      setPremium: (expiresAt) =>
        set((state) => ({
          userCredits: { ...state.userCredits, isPremium: true, premiumExpiresAt: expiresAt },
        })),

      setShowShop: (show) => set({ showShop: show }),
      setRobloxUser: (user) => set({ robloxUser: user }),
      setPluginStatus: (status) => set({ pluginStatus: status }),
    }),
    { name: "elixir-ai-storage" }
  )
);