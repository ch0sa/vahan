import type { ApplicationState } from "@prisma/client";

export type JourneyStep = "SELLER" | "BUYER" | "PAYMENT" | "CASE";
export type JourneyOutcome = "IN_PROGRESS" | "COMPLETED" | "REJECTED" | "WITHDRAWN";
export type JourneyProgress = { step: JourneyStep; completed: JourneyStep[]; percent: number; terminal: boolean; outcome: JourneyOutcome; nextAction: "CONTINUE" | "START_ANOTHER" };

const sellerStates = new Set<ApplicationState>(["DRAFT", "SELLER_ACTION_REQUIRED", "SELLER_VERIFIED"]);
const buyerStates = new Set<ApplicationState>(["BUYER_ACTION_REQUIRED", "BUYER_VERIFIED", "DOCUMENTS_REQUIRED", "READY_FOR_SUBMISSION"]);
const paymentStates = new Set<ApplicationState>(["PAYMENT_REQUIRED", "PAYMENT_PENDING", "PAYMENT_FAILED", "PAYMENT_RECONCILIATION_REQUIRED", "PAYMENT_CONFIRMED"]);
const terminalStates = new Set<ApplicationState>(["REJECTED", "REGISTRY_UPDATE_COMPLETE", "WITHDRAWN_EXTERNALLY_CONFIRMED"]);

export function journeyProgress(state: ApplicationState | string): JourneyProgress {
  const value = state as ApplicationState;
  if (sellerStates.has(value)) return { step: "SELLER", completed: [], percent: 20, terminal: false, outcome: "IN_PROGRESS", nextAction: "CONTINUE" };
  if (buyerStates.has(value)) return { step: "BUYER", completed: ["SELLER"], percent: 42, terminal: false, outcome: "IN_PROGRESS", nextAction: "CONTINUE" };
  if (paymentStates.has(value)) return { step: "PAYMENT", completed: ["SELLER", "BUYER"], percent: value === "PAYMENT_CONFIRMED" ? 70 : 60, terminal: false, outcome: "IN_PROGRESS", nextAction: "CONTINUE" };
  if (terminalStates.has(value)) return { step: "CASE", completed: ["SELLER", "BUYER", "PAYMENT", "CASE"], percent: 100, terminal: true, outcome: value === "REGISTRY_UPDATE_COMPLETE" ? "COMPLETED" : value === "REJECTED" ? "REJECTED" : "WITHDRAWN", nextAction: "START_ANOTHER" };
  return { step: "CASE", completed: ["SELLER", "BUYER", "PAYMENT"], percent: 82, terminal: false, outcome: "IN_PROGRESS", nextAction: "CONTINUE" };
}

export const journeySteps: JourneyStep[] = ["SELLER", "BUYER", "PAYMENT", "CASE"];
