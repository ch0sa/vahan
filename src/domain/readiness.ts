import { z } from "zod";
import { canonicalHash } from "./canonical";

export const readinessInputSchema = z.object({ registrationNumber: z.literal("KA01AB1234"), ownerId: z.string(), source: z.literal("MOCK_VEHICLE_REGISTRY"), sourceVersion: z.literal("seed-v1"), vehicleClass: z.literal("PRIVATE_NON_TRANSPORT"), registrationState: z.literal("KA") });
export type ReadinessStatus = "READY_FOR_DEMO" | "BLOCKED_FOR_DEMO" | "UNKNOWN";
export const ruleSchema = z.object({ scenario: z.literal("KA01AB1234"), owner: z.literal("synthetic-ananya-rao"), source: z.literal("MOCK_VEHICLE_REGISTRY") });
export type ReadinessResult = { status: ReadinessStatus; processingMode: "DEMO_RTO_HANDOVER"; findings: { code: string; result: ReadinessStatus; explanation: string; provenance: string }[]; ruleBodyHash: string; evaluatorVersion: string; disclosureVersion: string };
export const evaluatorVersion = "seller-readiness-v1";
export function evaluateReadiness(input: unknown, ruleBody: unknown): ReadinessResult {
  const hash = canonicalHash(ruleBody);
  if (!ruleSchema.safeParse(ruleBody).success) return { status: "UNKNOWN", processingMode: "DEMO_RTO_HANDOVER", findings: [{ code: "RULE_UNAVAILABLE", result: "UNKNOWN", explanation: "The synthetic rule configuration is unavailable.", provenance: "MoveKA prototype" }], ruleBodyHash: hash, evaluatorVersion, disclosureVersion: "prototype-disclosure-v1" };
  const parsed = readinessInputSchema.safeParse(input);
  if (!parsed.success) return { status: "UNKNOWN", processingMode: "DEMO_RTO_HANDOVER", findings: [{ code: "PROJECTION_UNKNOWN", result: "UNKNOWN", explanation: "This synthetic projection is incomplete or unavailable.", provenance: "MOCK_VEHICLE_REGISTRY" }], ruleBodyHash: hash, evaluatorVersion, disclosureVersion: "prototype-disclosure-v1" };
  if (parsed.data.ownerId !== "synthetic-ananya-rao") return { status: "BLOCKED_FOR_DEMO", processingMode: "DEMO_RTO_HANDOVER", findings: [{ code: "NOT_SYNTHETIC_OWNER", result: "BLOCKED_FOR_DEMO", explanation: "This prototype account is not the current synthetic owner.", provenance: "MOCK_VEHICLE_REGISTRY" }], ruleBodyHash: hash, evaluatorVersion, disclosureVersion: "prototype-disclosure-v1" };
  return { status: "READY_FOR_DEMO", processingMode: "DEMO_RTO_HANDOVER", findings: [{ code: "SYNTHETIC_SCENARIO_READY", result: "READY_FOR_DEMO", explanation: "Ready only for the deterministic synthetic demonstration; official conditions remain unknown.", provenance: "MOCK_VEHICLE_REGISTRY" }], ruleBodyHash: hash, evaluatorVersion, disclosureVersion: "prototype-disclosure-v1" };
}
