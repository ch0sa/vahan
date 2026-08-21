import { cookies } from "next/headers";
import Link from "next/link";
import { SubmitButton } from "@/app/components";
import { requireCurrentSession } from "@/src/identity/access";
import { requireDemoMode } from "@/src/identity/config";
import { prisma } from "@/src/lib/prisma";
import { stableIntentKey } from "@/src/domain/intent";
import { sellerErrorMessage } from "@/src/domain/seller-errors";
import { dictionary, localeFrom, stateLabel } from "@/src/i18n";
import { caseText, correctionExplanation, correctionReasonLabel, eventDetail, eventLabel } from "@/src/case-ui";
import { currentWorkspaceForUser } from "@/src/workspace/context";
import { journeyProgress, journeySteps } from "@/src/domain/journey-progress";
import { completeDemoJourney, submitCorrection } from "./actions";
import { createNewDemoJourney } from "@/app/dashboard/actions";

export const dynamic = "force-dynamic";

export default async function CasePage({ searchParams }: { searchParams: Promise<{ application?: string; error?: string }> }) {
  requireDemoMode();
  const session = await requireCurrentSession();
  const params = await searchParams;
  const locale = localeFrom((await cookies()).get("moveka_locale")?.value);
  const t = caseText[locale];
  const format = new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short" });
  const workspace = await currentWorkspaceForUser(session.userId);
  const app = params.application
    ? await prisma.application.findFirst({
        where: { id: params.application, workspaceId: workspace?.id, participants: { some: { userId: session.userId } } },
        include: {
          externalCase: true,
          correctionRequests: true,
          participants: true,
          workflowEvents: { orderBy: { version: "asc" } },
          inboxEvents: { orderBy: { receivedAt: "asc" } },
        },
      })
    : null;
  const error = sellerErrorMessage(params.error, locale);
  if (!app) return <div className="page-shell"><h1>{t.title}</h1>{error && <p role="alert">{error}</p>}<p>{t.none}</p></div>;

  const role = app.participants.find((participant) => participant.userId === session.userId)?.role;
  const request = app.correctionRequests.find((item) => item.status === "OPEN" && item.targetRole === role);
  const intent = (command: string) => stableIntentKey({ actorId: session.userId, scope: `application:${app.id}`, command, aggregateVersion: app.aggregateVersion });
  const backHref = role === "SELLER" ? `/seller?application=${app.id}` : `/buyer?application=${app.id}`;
  const progress = journeyProgress(app.state);
  const terminalTitle = progress.outcome === "COMPLETED" ? "Ownership transfer journey complete" : progress.outcome === "REJECTED" ? "Synthetic journey rejected" : "Synthetic journey withdrawn";
  const terminalBody = progress.outcome === "COMPLETED" ? "Rahul is now shown as the vehicle owner in this demo." : progress.outcome === "REJECTED" ? "This journey was not approved. You can start another demo journey." : "This journey ended after the simulated withdrawal confirmation. You can start another demo journey.";

  return <div className="page-shell">
    <nav className="breadcrumbs" aria-label="Breadcrumb"><Link href="/dashboard">Dashboard</Link><span aria-hidden>/</span><span>{t.title}</span></nav>
    <div className="page-heading"><p className="eyebrow">Ownership transfer</p><h1>{t.title}</h1><p className="lede">See what has happened and what to do next.</p></div>
    {error && <p role="alert" aria-live="assertive">{error}</p>}
    <section className="content-card journey-card-light" aria-label="Ownership transfer progress"><ol className="journey-stepper">{journeySteps.map((step, index) => { const progress = journeyProgress(app.state); return <li key={step} className={progress.step === step ? "active" : progress.completed.includes(step) ? "complete" : ""}>{index + 1}. {step[0] + step.slice(1).toLowerCase()}</li>; })}</ol></section>
    {progress.terminal ? <section className="completion-card"><p className="eyebrow">Journey outcome</p><h2>{terminalTitle}</h2><p>{terminalBody}</p></section> : <section className="content-card"><p className="section-kicker">Current status</p><h2 role="status" aria-live="polite">{stateLabel(locale, app.state)}</h2><p>{app.state === "SUBMITTED" ? "Your application is ready for the final review step." : "Your application is moving through the final step."}</p></section>}
    {app.externalCase && <p>{t.reference}: <span>{app.externalCase.externalReference}</span></p>}
    {["SUBMITTED", "SENT_TO_RTO", "RTO_PROCESSING", "APPROVED", "WITHDRAWAL_PENDING"].includes(app.state) && <section className="handoff-card"><h2>{app.state === "WITHDRAWAL_PENDING" ? "Continue this transfer" : "Finish the demo"}</h2><p className="demo-note">The next steps are simulated for this prototype. No government system is contacted.</p><form action={completeDemoJourney}><input type="hidden" name="applicationId" value={app.id}/><SubmitButton pendingText={dictionary[locale].working}>{app.state === "WITHDRAWAL_PENDING" ? "Cancel withdrawal and continue" : "Complete demo journey"}</SubmitButton></form></section>}
    {request && <section aria-labelledby="correction-heading">
      <h2 id="correction-heading">{t.correction}</h2>
      <dl>
        <dt>{t.correctionReason}</dt><dd>{correctionReasonLabel(locale, request.reasonCode)}</dd>
        <dt>{t.correctionDetails}</dt><dd>{correctionExplanation(locale, request.reasonCode)}</dd>
        <dt>{t.correctionTarget}</dt><dd>{request.targetRole === "SELLER" ? t.seller : t.buyer}</dd>
      </dl>
      <form action={submitCorrection}>
        <input type="hidden" name="applicationId" value={app.id}/>
        <input type="hidden" name="requestId" value={request.id}/>
        <input type="hidden" name="expectedVersion" value={app.aggregateVersion}/>
        <input type="hidden" name="intentKey" value={intent("SubmitCorrection")}/>
        <SubmitButton pendingText={dictionary[locale].working}>{t.confirm}</SubmitButton>
      </form>
    </section>}
    {["RTO_PROCESSING", "WITHDRAWAL_REQUIRES_RTO", "APPROVED"].includes(app.state) && <p>{t.manual}</p>}
    <details className="content-card"><summary>{t.timeline}</summary><ol>
      {app.workflowEvents.map((event) => <li key={event.id}><small>{t.step} {event.version}</small> <time dateTime={event.createdAt.toISOString()}>{format.format(event.createdAt)}</time> {eventLabel(locale, event.eventType)}</li>)}
      {app.inboxEvents.map((event) => { const detail=eventDetail(locale,event.kind??"",event.payload); return <li key={event.id}><time dateTime={event.receivedAt.toISOString()}>{format.format(event.processedAt ?? event.receivedAt)}</time> {t.external}: {eventLabel(locale, event.kind ?? "")}{detail&&<span> — {detail}</span>}</li>; })}
    </ol></details>
    {role === "BUYER" && ["BUYER_VERIFIED", "PAYMENT_REQUIRED", "PAYMENT_PENDING", "PAYMENT_CONFIRMED", "PAYMENT_FAILED", "PAYMENT_RECONCILIATION_REQUIRED"].includes(app.state) && <p><a href={`/buyer/payment?application=${app.id}`}>{t.payment}</a></p>}
    {journeyProgress(app.state).terminal && workspace && <form action={createNewDemoJourney}><input type="hidden" name="workspaceId" value={workspace.id}/><input type="hidden" name="intentKey" value={stableIntentKey({ actorId: session.userId, scope: `workspace:${workspace.id}`, command: "CreateDemoWorkspace", aggregateVersion: workspace.resetVersion })}/><SubmitButton pendingText={dictionary[locale].working}>Start another journey</SubmitButton></form>}
    <p><a href={backHref}>{t.back}</a></p>
  </div>;
}
