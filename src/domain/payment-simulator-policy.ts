import { createHash } from "node:crypto";
export type PaymentSimulatorKind="CONFIRMED"|"FAILED"|"AMBIGUOUS"|"RECONCILIATION_CONFIRMED"|"RECONCILIATION_FAILED";
export function allowedPaymentSimulatorKinds(status:string, hasOpenReconciliation:boolean):PaymentSimulatorKind[]{if(hasOpenReconciliation&&status==="RECONCILIATION_REQUIRED")return["RECONCILIATION_CONFIRMED","RECONCILIATION_FAILED"];if(status==="PENDING")return["CONFIRMED","FAILED","AMBIGUOUS"];return[];}
export function stablePaymentSimulatorEventId(applicationId:string,attemptId:string,kind:PaymentSimulatorKind,intentKey:string){return `mock-payment:${createHash("sha256").update(`${applicationId}:${attemptId}:${kind}:${intentKey}`).digest("hex")}`;}
