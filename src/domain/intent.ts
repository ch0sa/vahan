import { canonicalHash } from "./canonical";

export type IntentIdentity = { actorId: string; scope: string; command: string; aggregateVersion?: number };

// This is an idempotency identity, never authorization. Commands still authorize server-side.
export function stableIntentKey(identity: IntentIdentity): string {
  return `intent-v1-${canonicalHash(identity)}`;
}
