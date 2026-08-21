import { cookies } from "next/headers";
import Link from "next/link";
import { SubmitButton } from "@/app/components";
import { stableIntentKey } from "@/src/domain/intent";
import { sellerErrorMessage } from "@/src/domain/seller-errors";
import { requireCurrentSession } from "@/src/identity/access";
import { requireDemoMode } from "@/src/identity/config";
import { dictionary, localeFrom, stateLabel } from "@/src/i18n";
import { prisma } from "@/src/lib/prisma";
import { paymentStatusLabel, paymentText } from "@/src/payment-ui";
import { currentWorkspaceForUser } from "@/src/workspace/context";
import { journeyProgress, journeySteps } from "@/src/domain/journey-progress";
import { completeDemoPayment } from "./actions";
import { submitApplication } from "./submit-actions";

export const dynamic = "force-dynamic";

export default async function PaymentPage({ searchParams }: { searchParams: Promise<{ application?: string; error?: string }> }) {
  requireDemoMode();
  const session = await requireCurrentSession();
  const params = await searchParams;
  const locale = localeFrom((await cookies()).get("moveka_locale")?.value);
  const t = paymentText[locale];
  if (session.userId !== "synthetic-rahul-shetty") return <div className="page-shell"><h1>{t.title}</h1><p role="alert">{t.none}</p></div>;
  const workspace = await currentWorkspaceForUser(session.userId);
  const app = params.application && workspace ? await prisma.application.findFirst({ where: { id: params.application, workspaceId: workspace.id, participants: { some: { userId: session.userId, role: "BUYER" } } }, include: { payments: { include: { attempts: { orderBy: { attemptNumber: "desc" }, take: 1 }, pricingSnapshot: true } } } }) : null;
  if (!app) return <div className="page-shell"><h1>{t.title}</h1><p role="alert">{t.none}</p></div>;
  const payment = app.payments[0];
  const demoAmount = payment?.pricingSnapshot ? new Intl.NumberFormat(locale === "kn" ? "kn-IN" : "en-IN", { style: "currency", currency: payment.currency, maximumFractionDigits: 2 }).format(payment.amountMinor / 100) : null;
  const intent = (command: string) => stableIntentKey({ actorId: session.userId, scope: `application:${app.id}`, command, aggregateVersion: app.aggregateVersion });
  const error = sellerErrorMessage(params.error, locale);
  const button = (action: (formData: FormData) => void, label: string, command: string) => <form action={action}>
    <input type="hidden" name="applicationId" value={app.id} />
    <input type="hidden" name="expectedVersion" value={app.aggregateVersion} />
    <input type="hidden" name="intentKey" value={intent(command)} />
    <SubmitButton pendingText={dictionary[locale].working}>{label}</SubmitButton>
  </form>;
  return <div className="page-shell">
    <nav className="breadcrumbs" aria-label="Breadcrumb"><Link href="/dashboard">Dashboard</Link><span aria-hidden>/</span><Link href={`/buyer?application=${app.id}`}>Buyer review</Link><span aria-hidden>/</span><span>{t.title}</span></nav>
    <div className="page-heading"><p className="eyebrow">Ownership transfer · payment</p><h1>{t.title}</h1><p className="lede">Complete the payment step with one click.</p></div>
    {error && <p role="alert" aria-live="assertive">{error}</p>}
    <section className="content-card journey-card-light" aria-label="Ownership transfer progress"><ol className="journey-stepper">{journeySteps.map((step, index) => { const progress = journeyProgress(app.state); return <li key={step} className={progress.step === step ? "active" : progress.completed.includes(step) ? "complete" : ""}>{index + 1}. {step[0] + step.slice(1).toLowerCase()}</li>; })}</ol></section>
    <p className="demo-note">{t.disclosure}</p>
    <section className="content-card"><h2>{stateLabel(locale, app.state)}</h2>{demoAmount && <p>{t.price}: {demoAmount}</p>}<p role="status" aria-live="polite">{payment ? paymentStatusLabel(locale, payment.status) : t.none}</p></section>
    {["BUYER_VERIFIED","PAYMENT_REQUIRED","PAYMENT_PENDING","PAYMENT_FAILED","PAYMENT_RECONCILIATION_REQUIRED"].includes(app.state) && button(completeDemoPayment, t.completeDemo, "CompleteSyntheticDemoPayment")}
    {app.state === "PAYMENT_FAILED" && <p role="status">{t.failed}</p>}
    {app.state === "PAYMENT_PENDING" && <p role="status">{t.pending}</p>}
    {app.state === "PAYMENT_CONFIRMED" && button(submitApplication, t.submit, "SubmitApplication")}
    {["SUBMITTED","SENT_TO_RTO","RTO_PROCESSING","APPROVED","REGISTRY_UPDATE_COMPLETE"].includes(app.state) && <p><Link className="button-link" href={`/case?application=${app.id}`}>{t.case}</Link></p>}
    {payment?.status === "RECONCILIATION_REQUIRED" && <p role="status">{t.reconcile}</p>}
    <p><a href={`/buyer?application=${app.id}`}>{t.back}</a></p>
  </div>;
}
