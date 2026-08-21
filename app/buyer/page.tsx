import { cookies } from "next/headers";
import Link from "next/link";
import { SubmitButton } from "@/app/components";
import { syntheticBuyerId } from "@/src/domain/buyer-flow";
import { stableIntentKey } from "@/src/domain/intent";
import { sellerErrorMessage } from "@/src/domain/seller-errors";
import { requireCurrentSession } from "@/src/identity/access";
import { requireDemoMode } from "@/src/identity/config";
import { dictionary, localeFrom, stateLabel } from "@/src/i18n";
import { prisma } from "@/src/lib/prisma";
import { buyerText } from "@/src/buyer-ui";
import { currentWorkspaceForUser } from "@/src/workspace/context";
import { journeyProgress, journeySteps } from "@/src/domain/journey-progress";
import { acceptBuyer } from "./actions";
import { createNewDemoJourney } from "@/app/dashboard/actions";

export const dynamic = "force-dynamic";
const paymentResumeStates = ["BUYER_VERIFIED", "PAYMENT_REQUIRED", "PAYMENT_PENDING", "PAYMENT_CONFIRMED", "PAYMENT_FAILED", "PAYMENT_RECONCILIATION_REQUIRED"];
const trackingStates = ["SUBMITTED", "SENT_TO_RTO", "RTO_PROCESSING", "CORRECTION_REQUIRED", "APPROVED", "REJECTED", "REGISTRY_UPDATE_COMPLETE", "WITHDRAWAL_PENDING", "WITHDRAWAL_REQUIRES_RTO", "WITHDRAWN_EXTERNALLY_CONFIRMED"];

export default async function BuyerPage({ searchParams }: { searchParams: Promise<{ application?: string; error?: string }> }) {
  requireDemoMode();
  const session = await requireCurrentSession();
  const params = await searchParams;
  const locale = localeFrom((await cookies()).get("moveka_locale")?.value);
  const t = buyerText[locale];
  if (session.userId !== syntheticBuyerId) return <div className="page-shell"><h1>{t.title}</h1><p role="alert">{t.none}</p></div>;
  const participant = { some: { userId: session.userId, role: "BUYER" as const } };
  const workspace = await currentWorkspaceForUser(session.userId);
  const app = params.application
    ? await prisma.application.findFirst({ where: { id: params.application, workspaceId: workspace?.id, participants: participant }, include: { buyerInformation: true } })
    : workspace ? await prisma.application.findFirst({ where: { workspaceId: workspace.id, participants: participant }, orderBy: { updatedAt: "desc" }, include: { buyerInformation: true } }) : null;
  const error = sellerErrorMessage(params.error, locale);
  return <div className="page-shell">
    <nav className="breadcrumbs" aria-label="Breadcrumb"><Link href="/dashboard">Dashboard</Link><span aria-hidden>/</span><span>{t.title}</span></nav>
    <div className="page-heading"><p className="eyebrow">Ownership transfer · buyer</p><h1>{t.title}</h1><p className="lede">Check the transfer details, confirm them, and continue to payment.</p></div>
    {error && <p role="alert" aria-live="assertive">{error}</p>}
    <section className="content-card journey-card-light" aria-label="Ownership transfer progress"><ol className="journey-stepper">{journeySteps.map((step, index) => { const progress = journeyProgress(app?.state ?? "BUYER_ACTION_REQUIRED"); return <li key={step} className={progress.step === step ? "active" : progress.completed.includes(step) ? "complete" : ""}>{index + 1}. {step[0] + step.slice(1).toLowerCase()}</li>; })}</ol></section>
    {!app ? <p>{t.none}</p> : <section>
      <h2>{t.status}: <span role="status">{stateLabel(locale, app.state)}</span></h2>
      {app.state === "BUYER_ACTION_REQUIRED" && <><p className="demo-note">{t.warning}</p><section className="content-card"><h3>{t.evidence}</h3><ul className="check-list"><li>Vehicle KA01AB1234</li><li>Seller: Ananya Rao</li><li>Your sample details are ready</li></ul></section></>}
      {app.state === "BUYER_ACTION_REQUIRED" && <form action={acceptBuyer}>
        <input type="hidden" name="applicationId" value={app.id} />
        <input type="hidden" name="expectedVersion" value={app.aggregateVersion} />
        <input type="hidden" name="intentKey" value={stableIntentKey({ actorId: session.userId, command: "CompleteBuyerAcceptance", scope: `application:${app.id}`, aggregateVersion: app.aggregateVersion })} />
        <p>{t.statement}</p><p className="demo-note">This demo confirmation is not a government identity check or legal signature.</p>
        <SubmitButton pendingText={dictionary[locale].working}>{t.accept}</SubmitButton>
      </form>}
      {paymentResumeStates.includes(app.state) && <p><Link className="button-link" href={`/buyer/payment?application=${app.id}`}>{t.payment}</Link></p>}
      {trackingStates.includes(app.state) && <div className={app.state === "REGISTRY_UPDATE_COMPLETE" ? "completion-card" : "handoff-card"}><h3>{app.state === "REGISTRY_UPDATE_COMPLETE" ? "Transfer complete" : "Your application has been submitted"}</h3><p>{app.state === "REGISTRY_UPDATE_COMPLETE" ? "The ownership-transfer demo is complete." : "Continue to see the application result."}</p><Link className="button-link" href={`/case?application=${app.id}`}>{t.case}</Link></div>}
      <p><Link className="text-link" href="/buyer/notifications">{t.notifications}</Link></p>
      {journeyProgress(app.state).terminal && workspace && <form action={createNewDemoJourney}><input type="hidden" name="workspaceId" value={workspace.id}/><input type="hidden" name="intentKey" value={stableIntentKey({ actorId: session.userId, scope: `workspace:${workspace.id}`, command: "CreateDemoWorkspace", aggregateVersion: workspace.resetVersion })}/><SubmitButton pendingText={dictionary[locale].working}>Start another journey</SubmitButton></form>}
    </section>}
  </div>;
}
