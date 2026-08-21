const paymentStates = new Set(["BUYER_VERIFIED", "PAYMENT_REQUIRED", "PAYMENT_PENDING", "PAYMENT_FAILED", "PAYMENT_RECONCILIATION_REQUIRED", "PAYMENT_CONFIRMED"]);
const caseStates = new Set(["SUBMITTED", "SENT_TO_RTO", "RTO_PROCESSING", "CORRECTION_REQUIRED", "WITHDRAWAL_PENDING", "WITHDRAWAL_REQUIRES_RTO", "WITHDRAWN_EXTERNALLY_CONFIRMED", "APPROVED", "REJECTED", "REGISTRY_UPDATE_COMPLETE"]);

/** A route is derived only after workspace membership and participant scope are checked. */
export function selectedWorkspaceDestination(userId: string, application: { id: string; state: string; participantRole: "SELLER" | "BUYER" } | null) {
  if (!application) return userId === "synthetic-ananya-rao" ? "/seller" : "/buyer";
  if (application.participantRole === "BUYER") {
    if (paymentStates.has(application.state)) return `/buyer/payment?application=${application.id}`;
    if (caseStates.has(application.state)) return `/case?application=${application.id}`;
    return `/buyer?application=${application.id}`;
  }
  if (["DRAFT", "SELLER_ACTION_REQUIRED", "SELLER_VERIFIED"].includes(application.state)) return `/seller?application=${application.id}`;
  return `/case?application=${application.id}`;
}

export function dashboardDestination(role: "CITIZEN" | "DEMO_OPERATOR", userId: string, application: { id: string; state: string } | null) {
  if (role === "DEMO_OPERATOR") return { href: "/demo/backoffice", action: "Review demo operations" };
  if (!application) return { href: userId === "synthetic-ananya-rao" ? "/seller" : "/buyer", action: "Open your workspace" };
  if (userId === "synthetic-rahul-shetty") {
    if (paymentStates.has(application.state)) return { href: `/buyer/payment?application=${application.id}`, action: application.state === "PAYMENT_CONFIRMED" ? "Submit the application" : "Complete payment" };
    if (caseStates.has(application.state)) return { href: `/case?application=${application.id}`, action: "View case status" };
    return { href: `/buyer?application=${application.id}`, action: "Review buyer step" };
  }
  if (["DRAFT", "SELLER_ACTION_REQUIRED", "SELLER_VERIFIED"].includes(application.state)) return { href: `/seller?application=${application.id}`, action: "Continue seller step" };
  if (application.state === "BUYER_ACTION_REQUIRED") return { href: "/demo-helper", action: "Switch to Rahul’s demo account" };
  return { href: `/case?application=${application.id}`, action: "View case status" };
}
