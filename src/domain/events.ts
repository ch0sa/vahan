import type { WorkflowState } from "./workflow";

export type ExternalEvent = { source: string; externalEventId: string; sequence: number; aggregateVersion: number; kind: "INWARDED" | "CORRECTION" | "APPROVED" | "REJECTED" | "REGISTRY_COMPLETE" };
export type EventDisposition = "APPLY" | "DUPLICATE" | "STALE" | "QUARANTINE";
export function classifyExternalEvent(event: ExternalEvent, seenEventIds: ReadonlySet<string>, lastSequence: number, state: WorkflowState): EventDisposition {
  if (seenEventIds.has(`${event.source}:${event.externalEventId}`)) return "DUPLICATE";
  if (event.sequence <= lastSequence) return "STALE";
  if (state === "REGISTRY_UPDATE_COMPLETE" || state === "REJECTED" || (event.kind === "REGISTRY_COMPLETE" && state !== "APPROVED")) return "QUARANTINE";
  return "APPLY";
}
