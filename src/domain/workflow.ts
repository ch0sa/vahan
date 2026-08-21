export const workflowStates = [
  "DRAFT", "SELLER_ACTION_REQUIRED", "SELLER_VERIFIED", "BUYER_ACTION_REQUIRED", "BUYER_VERIFIED",
  "DOCUMENTS_REQUIRED", "READY_FOR_SUBMISSION", "PAYMENT_REQUIRED", "PAYMENT_PENDING", "PAYMENT_CONFIRMED",
  "PAYMENT_FAILED", "PAYMENT_RECONCILIATION_REQUIRED", "SUBMITTED", "SENT_TO_RTO", "RTO_PROCESSING",
  "CORRECTION_REQUIRED", "APPROVED", "REJECTED", "REGISTRY_UPDATE_COMPLETE", "WITHDRAWAL_PENDING",
  "WITHDRAWAL_REQUIRES_RTO", "WITHDRAWN_EXTERNALLY_CONFIRMED"
] as const;
export type WorkflowState = typeof workflowStates[number];
export type ParticipantRole = "SELLER" | "BUYER" | "DEMO_OPERATOR";
export type Command =
  | "START_SELLER_STEP" | "COMPLETE_SELLER_DECLARATION" | "INVITE_BUYER" | "COMPLETE_BUYER_ACCEPTANCE"
  | "EVALUATE_REQUIREMENTS_READY" | "EVALUATE_REQUIREMENTS_MISSING" | "CONFIRM_READINESS" | "CREATE_PAYMENT"
  | "INITIATE_PAYMENT" | "SUBMIT_APPLICATION" | "ACKNOWLEDGE_SUBMISSION" | "SUBMIT_CORRECTION" | "ACKNOWLEDGE_CORRECTION"
  | "REQUEST_WITHDRAWAL" | "EXTERNAL_INWARDED" | "EXTERNAL_CORRECTION" | "EXTERNAL_APPROVED"
  | "EXTERNAL_REJECTED" | "EXTERNAL_REGISTRY_COMPLETE" | "EXTERNAL_PAYMENT_CONFIRMED"
  | "EXTERNAL_PAYMENT_FAILED" | "EXTERNAL_PAYMENT_AMBIGUOUS" | "EXTERNAL_RECONCILIATION_CONFIRMED"
  | "EXTERNAL_RECONCILIATION_FAILED" | "EXTERNAL_WITHDRAWAL_CONFIRMED";

export type TransitionInput = { state: WorkflowState; command: Command; actor: ParticipantRole; recentTotp?: boolean; allRequirementsSatisfied?: boolean };
export type TransitionResult = { allowed: true; next: WorkflowState } | { allowed: false; reason: string };
const allow = (next: WorkflowState): TransitionResult => ({ allowed: true, next });
const deny = (reason: string): TransitionResult => ({ allowed: false, reason });

export function transition(input: TransitionInput): TransitionResult {
  const seller = input.actor === "SELLER";
  const buyer = input.actor === "BUYER";
  const operator = input.actor === "DEMO_OPERATOR";
  switch (input.command) {
    case "START_SELLER_STEP": return input.state === "DRAFT" && seller ? allow("SELLER_ACTION_REQUIRED") : deny("Only the seller can start a draft.");
    case "COMPLETE_SELLER_DECLARATION": return input.state === "SELLER_ACTION_REQUIRED" && seller ? allow("SELLER_VERIFIED") : deny("Only the named seller can complete the declaration.");
    case "INVITE_BUYER": return input.state === "SELLER_VERIFIED" && seller ? allow("BUYER_ACTION_REQUIRED") : deny("The seller must complete their part before inviting the buyer.");
    case "COMPLETE_BUYER_ACCEPTANCE": return input.state === "BUYER_ACTION_REQUIRED" && buyer ? allow("BUYER_VERIFIED") : deny("Only the named buyer can accept.");
    case "EVALUATE_REQUIREMENTS_READY": return input.state === "BUYER_VERIFIED" ? allow("READY_FOR_SUBMISSION") : deny("Requirements can only be evaluated after buyer verification.");
    case "EVALUATE_REQUIREMENTS_MISSING": return input.state === "BUYER_VERIFIED" ? allow("DOCUMENTS_REQUIRED") : deny("Requirements can only be evaluated after buyer verification.");
    case "CONFIRM_READINESS": return input.state === "DOCUMENTS_REQUIRED" && input.allRequirementsSatisfied ? allow("READY_FOR_SUBMISSION") : deny("All synthetic required items must be satisfied.");
    case "CREATE_PAYMENT": return input.state === "READY_FOR_SUBMISSION" && buyer ? allow("PAYMENT_REQUIRED") : deny("Only the buyer can create a payment obligation.");
    case "INITIATE_PAYMENT": return (input.state === "PAYMENT_REQUIRED" || input.state === "PAYMENT_FAILED") && buyer ? allow("PAYMENT_PENDING") : deny("Payment cannot be initiated from this state.");
    case "EXTERNAL_PAYMENT_CONFIRMED": return input.state === "PAYMENT_PENDING" && operator ? allow("PAYMENT_CONFIRMED") : deny("Only a matched synthetic payment event can confirm payment.");
    case "EXTERNAL_PAYMENT_FAILED": return input.state === "PAYMENT_PENDING" && operator ? allow("PAYMENT_FAILED") : deny("Only a matched synthetic payment event can fail payment.");
    case "EXTERNAL_PAYMENT_AMBIGUOUS": return input.state === "PAYMENT_PENDING" && operator ? allow("PAYMENT_RECONCILIATION_REQUIRED") : deny("Only external ambiguity can require reconciliation.");
    case "EXTERNAL_RECONCILIATION_CONFIRMED": return input.state === "PAYMENT_RECONCILIATION_REQUIRED" && operator ? allow("PAYMENT_CONFIRMED") : deny("Only a synthetic provider reconciliation can confirm payment.");
    case "EXTERNAL_RECONCILIATION_FAILED": return input.state === "PAYMENT_RECONCILIATION_REQUIRED" && operator ? allow("PAYMENT_FAILED") : deny("Only a synthetic provider reconciliation can fail payment.");
    case "SUBMIT_APPLICATION": return input.state === "PAYMENT_CONFIRMED" && buyer ? allow("SUBMITTED") : deny("Submission requires confirmed payment and buyer authorization.");
    case "ACKNOWLEDGE_SUBMISSION": return input.state === "SUBMITTED" && operator ? allow("SENT_TO_RTO") : deny("Only a synthetic external acknowledgement can send a case to the RTO.");
    case "EXTERNAL_INWARDED": return input.state === "SENT_TO_RTO" && operator ? allow("RTO_PROCESSING") : deny("Inwarding must be a matched external event.");
    case "EXTERNAL_CORRECTION": return input.state === "RTO_PROCESSING" && operator ? allow("CORRECTION_REQUIRED") : deny("Correction must be an external processing event.");
    case "SUBMIT_CORRECTION": return input.state === "CORRECTION_REQUIRED" && (seller || buyer) ? allow("CORRECTION_REQUIRED") : deny("Only a participant can submit a correction.");
    case "ACKNOWLEDGE_CORRECTION": return input.state === "CORRECTION_REQUIRED" && operator ? allow("RTO_PROCESSING") : deny("Only a synthetic external acknowledgement can resume RTO processing.");
    case "EXTERNAL_APPROVED": return input.state === "RTO_PROCESSING" && operator ? allow("APPROVED") : deny("Approval must be an external event while processing.");
    case "EXTERNAL_REJECTED": return input.state === "RTO_PROCESSING" && operator ? allow("REJECTED") : deny("Rejection must be an external event while processing.");
    case "EXTERNAL_REGISTRY_COMPLETE": return input.state === "APPROVED" && operator ? allow("REGISTRY_UPDATE_COMPLETE") : deny("Registry completion requires prior approval and an external event.");
    case "REQUEST_WITHDRAWAL":
      if (input.state === "SUBMITTED" || input.state === "SENT_TO_RTO") return (seller || buyer) ? allow("WITHDRAWAL_PENDING") : deny("Only a participant can request withdrawal.");
      return input.state === "RTO_PROCESSING" && (seller || buyer) ? allow("WITHDRAWAL_REQUIRES_RTO") : deny("Withdrawal rules are synthetic and state-dependent.");
    case "EXTERNAL_WITHDRAWAL_CONFIRMED": return input.state === "WITHDRAWAL_PENDING" && operator ? allow("WITHDRAWN_EXTERNALLY_CONFIRMED") : deny("Withdrawal is complete only after a matched synthetic external confirmation.");
  }
}
