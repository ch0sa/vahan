export type CommandIdempotency = { applicationId: string; actorId: string; key: string; expectedVersion: number };
export type OrderedExternalEvent = { source: string; externalEventId: string; sequence: number };
