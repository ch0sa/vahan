import { cookies } from "next/headers";
import Link from "next/link";
import { SubmitButton } from "@/app/components";
import { sellerErrorMessage } from "@/src/domain/seller-errors";
import { stableIntentKey } from "@/src/domain/intent";
import { requireCurrentSession } from "@/src/identity/access";
import { requireDemoMode } from "@/src/identity/config";
import { dictionary, findingLabel, localeFrom, sellerText, stateLabel } from "@/src/i18n";
import { prisma } from "@/src/lib/prisma";
import { currentWorkspaceForUser } from "@/src/workspace/context";
import { journeyProgress, journeySteps } from "@/src/domain/journey-progress";
import { completeSeller, createSellerDraft, evaluateSellerReadiness, inviteBuyer } from "./actions";
import { createNewDemoJourney } from "@/app/dashboard/actions";

export const dynamic = "force-dynamic";

export default async function SellerPage({ searchParams }: { searchParams: Promise<{ application?: string; error?: string }> }) {
  requireDemoMode();
  const session = await requireCurrentSession();
  const params = await searchParams;
  const locale = localeFrom((await cookies()).get("moveka_locale")?.value);
  const t = sellerText[locale];
  const workspace = await currentWorkspaceForUser(session.userId);
  const app = params.application
    ? await prisma.application.findFirst({ where: { id: params.application, workspaceId: workspace?.id, participants: { some: { userId: session.userId, role: "SELLER" } } }, include: { readinessResults: { orderBy: { createdAt: "desc" }, take: 1 } } })
    : workspace ? await prisma.application.findFirst({ where: { workspaceId: workspace.id, participants: { some: { userId: session.userId, role: "SELLER" } } }, orderBy: { updatedAt: "desc" }, include: { readinessResults: { orderBy: { createdAt: "desc" }, take: 1 } } }) : null;
  const key = (command: string) => stableIntentKey({ actorId: session.userId, command, scope: `application:${app?.id ?? "vehicle"}`, aggregateVersion: app?.aggregateVersion });
  const error = sellerErrorMessage(params.error, locale);

  return <div className="page-shell">
    <nav className="breadcrumbs" aria-label="Breadcrumb"><Link href="/dashboard">Dashboard</Link><span aria-hidden>/</span><span>{t.title}</span></nav>
    <div className="page-heading"><p className="eyebrow">Ownership transfer · seller</p><h1>{t.title}</h1><p className="lede">Check the vehicle, confirm the transfer, and send it to the buyer.</p></div>
    {error && <p role="alert" aria-live="assertive" tabIndex={-1}>{error}</p>}
    <section className="content-card journey-card-light" aria-label="Ownership transfer progress"><ol className="journey-stepper">{journeySteps.map((step, index) => { const progress = journeyProgress(app?.state ?? "DRAFT"); return <li key={step} className={progress.step === step ? "active" : progress.completed.includes(step) ? "complete" : ""}>{index + 1}. {step[0] + step.slice(1).toLowerCase()}</li>; })}</ol></section>
    {!app ? <form action={createSellerDraft}>
      <input type="hidden" name="intentKey" value={key("CreateTransferDraft")} />
      <SubmitButton pendingText={dictionary[locale].working}>{t.start} KA01AB1234</SubmitButton>
    </form> : <section>
      <p><a href={`/case?application=${app.id}`}>{t.case}</a></p>
      <h2>{t.status}: <span role="status">{stateLabel(locale, app.state)}</span></h2>
      {app.readinessResults[0] && <section aria-labelledby="findings">
        <h3 id="findings">{t.findings}</h3>
        <ul className="check-list">{(app.readinessResults[0].findings as { code: string }[]).map((finding) => <li key={finding.code}>{findingLabel(locale, finding.code)}</li>)}</ul>
      </section>}
      {app.state === "DRAFT" && <form action={evaluateSellerReadiness}>
        <input type="hidden" name="applicationId" value={app.id} />
        <input type="hidden" name="intentKey" value={key("EvaluateReadiness")} />
        <input type="hidden" name="expectedVersion" value={app.aggregateVersion} />
        <SubmitButton pendingText={dictionary[locale].working}>{t.readiness}</SubmitButton>
      </form>}
      {app.readinessResults[0] && app.state === "SELLER_ACTION_REQUIRED" && <form action={completeSeller}>
        <input type="hidden" name="applicationId" value={app.id} />
        <input type="hidden" name="readinessResultId" value={app.readinessResults[0].id} />
        <input type="hidden" name="intentKey" value={key("CompleteSellerDeclaration")} />
        <p>{t.statement}</p><p className="demo-note">This demo confirmation is not a government identity check or legal signature.</p>
        <p>{t.buyerWaits}</p>
        <SubmitButton pendingText={dictionary[locale].working}>{t.declare}</SubmitButton>
      </form>}
      {app.state === "SELLER_VERIFIED" && <form action={inviteBuyer}>
        <input type="hidden" name="applicationId" value={app.id} />
        <input type="hidden" name="expectedVersion" value={app.aggregateVersion} />
        <input type="hidden" name="intentKey" value={key("InviteBuyer")} />
        <SubmitButton pendingText={dictionary[locale].working}>{t.invite}</SubmitButton>
      </form>}
      {app.state === "BUYER_ACTION_REQUIRED" && <section className="handoff-card" role="status"><h3>{t.status}</h3><p>{t.handoff}</p><Link className="button-link" href="/demo-helper">{t.switchAccount}</Link></section>}
    </section>}
    {app && journeyProgress(app.state).terminal && workspace && <form action={createNewDemoJourney}><input type="hidden" name="workspaceId" value={workspace.id}/><input type="hidden" name="intentKey" value={stableIntentKey({ actorId: session.userId, scope: `workspace:${workspace.id}`, command: "CreateDemoWorkspace", aggregateVersion: workspace.resetVersion })}/><SubmitButton pendingText={dictionary[locale].working}>Start another journey</SubmitButton></form>}
  </div>;
}
