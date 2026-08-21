export function canUseDemoBackoffice(input: { demoMode: boolean; role?: string }) { return input.demoMode && input.role === "DEMO_OPERATOR"; }
export function canDispatchGovernmentOutbox(input: { kind: string; status: string }) { return input.kind === "GOVERNMENT_CASE_SUBMIT" && (input.status === "PENDING" || input.status === "PROCESSING"); }
export function cooldownActive(lastActionAt: number | undefined, now: number, cooldownMs = 5_000) { return lastActionAt !== undefined && now - lastActionAt < cooldownMs; }
