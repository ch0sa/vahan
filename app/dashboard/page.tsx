import Link from "next/link";
import { requireCurrentSession } from "@/src/identity/access";
import { prisma } from "@/src/lib/prisma";
import { stateLabel } from "@/src/i18n";
import { stableIntentKey } from "@/src/domain/intent";
import { journeyProgress } from "@/src/domain/journey-progress";
import { currentWorkspaceForUser } from "@/src/workspace/context";
import { sellerErrorMessage } from "@/src/domain/seller-errors";
import { cookies } from "next/headers";
import { localeFrom } from "@/src/i18n";
import { SubmitButton } from "@/app/components";
import { createNewDemoJourney, resetCurrentWorkspace, selectWorkspace } from "./actions";
import { dashboardDestination } from "@/src/workspace/navigation";

export const dynamic = "force-dynamic";

export default async function DashboardPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const session = await requireCurrentSession();
  const locale = localeFrom((await cookies()).get("moveka_locale")?.value);
  const error = sellerErrorMessage((await searchParams).error, locale);
  const dateFormat = new Intl.DateTimeFormat(locale === "kn" ? "kn-IN" : "en-IN", { dateStyle: "medium" });
  const workspace = await currentWorkspaceForUser(session.userId);
  const workspaceChoices = session.user.role === "CITIZEN" ? await prisma.workspace.findMany({
    where: { memberships: { some: { userId: session.userId } } },
    orderBy: { createdAt: "desc" },
    include: {
      applications: { where: { participants: { some: { userId: session.userId } } }, orderBy: { updatedAt: "desc" }, take: 1, include: { vehicle: true } },
    },
  }) : [];
  const applications = workspace && session.user.role === "CITIZEN" ? await prisma.application.findMany({ where: { workspaceId: workspace.id, participants: { some: { userId: session.userId } } }, orderBy: { updatedAt: "desc" }, include: { vehicle: true } }) : [];
  const active = applications[0] ?? null;
  const destination = dashboardDestination(session.user.role, session.userId, active);
  const newIntent = workspace ? stableIntentKey({ actorId: session.userId, scope: `workspace:${workspace.id}`, command: "CreateDemoWorkspace", aggregateVersion: workspace.resetVersion }) : "";
  const resetIntent = workspace ? stableIntentKey({ actorId: session.userId, scope: `workspace:${workspace.id}`, command: "ResetDemoWorkspace", aggregateVersion: workspace.resetVersion }) : "";
  return <div className="page-shell dashboard-shell">
    <nav className="breadcrumbs" aria-label="Breadcrumb"><Link href="/">Home</Link><span aria-hidden>/</span><span>Dashboard</span></nav>
    <div className="dashboard-welcome"><div><p className="eyebrow">Demo workspace</p><h1>Good to see you, {session.user.displayName.split(" ")[0]}.</h1><p>{workspace ? `${workspace.label}. ${destination.action}.` : "No accessible demo workspace is available."}</p></div><span className="avatar large">{session.user.displayName.split(" ").map((part) => part[0]).join("")}</span></div>
    {error && <p role="alert" aria-live="assertive" tabIndex={-1}>{error}</p>}
    {workspace && session.user.role === "CITIZEN" && <section className="content-card"><div className="section-heading"><div><p className="section-kicker">Journey controls</p><h2>Start fresh or return to a saved journey</h2></div></div><form action={selectWorkspace} className="stack-form"><label htmlFor="workspaceId">Choose a saved journey</label><select id="workspaceId" name="workspaceId" defaultValue={workspace.id}>{workspaceChoices.map((choice) => { const app = choice.applications[0]; return <option key={choice.id} value={choice.id}>{choice.label}{choice.id === workspace.id ? " (current)" : ""} · {dateFormat.format(choice.createdAt)}{app ? ` — ${app.vehicle.registrationNumber}, ${stateLabel("en", app.state)}` : " — not started"}</option>; })}</select><SubmitButton pendingText="Opening journey…">Open selected journey</SubmitButton></form><div className="card-actions"><form action={createNewDemoJourney}><input type="hidden" name="workspaceId" value={workspace.id}/><input type="hidden" name="intentKey" value={newIntent}/><SubmitButton pendingText="Creating journey…">Start a new journey</SubmitButton></form><form action={resetCurrentWorkspace}><input type="hidden" name="workspaceId" value={workspace.id}/><input type="hidden" name="intentKey" value={resetIntent}/><label className="confirm-control"><input type="checkbox" name="confirmation" value="RESET" required /> Clear the progress in this journey and start again.</label><SubmitButton pendingText="Resetting journey…">Reset this journey</SubmitButton></form></div><p className="muted">Reset affects only the selected demo journey. Your other saved journeys stay unchanged.</p></section>}
    <section className="content-card"><div className="section-heading"><div><p className="section-kicker">Your journeys</p><h2>{applications.length ? "Continue where you left off" : "This journey has not started"}</h2></div></div>{applications.length ? <ul className="check-list">{applications.map((application) => { const progress = journeyProgress(application.state); const target = dashboardDestination(session.user.role, session.userId, application); const outcome = progress.outcome === "COMPLETED" ? "Completed" : progress.outcome === "REJECTED" ? "Not approved" : progress.outcome === "WITHDRAWN" ? "Withdrawn" : `Current step: ${progress.step}`; return <li key={application.id}><strong>{application.vehicle.registrationNumber} · {stateLabel("en", application.state)}</strong><br/><small>{outcome}</small><br/>{progress.terminal ? <form action={createNewDemoJourney}><input type="hidden" name="workspaceId" value={workspace?.id}/><input type="hidden" name="intentKey" value={newIntent}/><SubmitButton pendingText="Creating journey…">Start another journey</SubmitButton></form> : <Link href={target.href}>{target.action}</Link>} · <Link href={`/case?application=${application.id}`}>View progress</Link></li>; })}</ul> : <Link className="button-link" href={destination.href}>{destination.action}</Link>}</section>
  </div>;
}
