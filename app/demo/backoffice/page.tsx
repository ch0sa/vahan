import { cookies } from "next/headers";
import { SubmitButton } from "@/app/components";
import {
  dispatchFollowupOutbox,
  dispatchGovernmentSubmit,
  emitSyntheticPaymentEvent,
  emitSyntheticRtoEvent,
} from "./actions";
import {
  backofficeError,
  backofficeText,
  followupLabel,
  paymentSimulatorText,
  simulatorLabel,
} from "@/src/backoffice-ui";
import { followupDeliveryMatches } from "@/src/domain/followup-policy";
import { stableIntentKey } from "@/src/domain/intent";
import { allowedPaymentSimulatorKinds } from "@/src/domain/payment-simulator-policy";
import { allowedSimulatorEvents } from "@/src/domain/simulator-policy";
import { requireDemoOperator } from "@/src/identity/access";
import { requireDemoMode } from "@/src/identity/config";
import { dictionary, localeFrom, stateLabel } from "@/src/i18n";
import { prisma } from "@/src/lib/prisma";
import { paymentStatusLabel } from "@/src/payment-ui";

export const dynamic = "force-dynamic";

export default async function BackofficePage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  requireDemoMode();
  const operator = await requireDemoOperator();
  const locale = localeFrom((await cookies()).get("moveka_locale")?.value);
  const t = backofficeText[locale];
  const pt = paymentSimulatorText[locale];
  const error = (await searchParams).error;
  const outbox = await prisma.outboxMessage.findMany({
    where: { kind: "GOVERNMENT_CASE_SUBMIT" },
    include: {
      application: {
        include: {
          externalCase: true,
          correctionRequests: {
            where: { status: "OPEN" },
            include: { submissions: { orderBy: { version: "desc" }, take: 1 } },
          },
          withdrawalRequests: {
            where: { status: "OPEN" },
            orderBy: { createdAt: "desc" },
            take: 1,
          },
          outboxMessages: {
            where: {
              status: "SUCCEEDED",
              kind: { in: ["CORRECTION_SUBMIT", "WITHDRAWAL_REQUEST"] },
            },
          },
        },
      },
    },
    take: 20,
  });
  const followups = await prisma.outboxMessage.findMany({
    where: { kind: { in: ["CORRECTION_SUBMIT", "WITHDRAWAL_REQUEST"] } },
    take: 20,
  });
  const attempts = await prisma.paymentAttempt.findMany({
    where: { providerReference: { not: null } },
    include: {
      payment: { include: { application: true, reconciliations: { where: { status: "OPEN" } } } },
      providerEvents: { where: { disposition: "APPLIED" }, take: 1 },
    },
    take: 20,
  });

  return (
    <>
      <h1>{t.title}</h1>
      {error && <p role="alert">{backofficeError(locale, error)}</p>}
      <p>{t.warning}</p>
      <ul>
        {outbox.map((item) => {
          const app = item.application;
          const correctionId = app?.correctionRequests[0]?.submissions[0]?.id;
          const withdrawalId = app?.withdrawalRequests[0]?.id;
          const correctionDelivered = Boolean(
            app && correctionId && app.outboxMessages.some((message) =>
              followupDeliveryMatches({
                kind: message.kind,
                status: message.status,
                applicationId: message.applicationId ?? "",
                expectedApplicationId: app.id,
                payload: message.payload,
                key: "correctionSubmissionId",
                expectedId: correctionId,
              }),
            ),
          );
          const withdrawalDelivered = Boolean(
            app && withdrawalId && app.outboxMessages.some((message) =>
              followupDeliveryMatches({
                kind: message.kind,
                status: message.status,
                applicationId: message.applicationId ?? "",
                expectedApplicationId: app.id,
                payload: message.payload,
                key: "withdrawalRequestId",
                expectedId: withdrawalId,
              }),
            ),
          );
          const events = app
            ? allowedSimulatorEvents(app.state, correctionDelivered, withdrawalDelivered)
            : [];
          return (
            <li key={item.id}>
              <p>{t.case}: {app && stateLabel(locale, app.state)}</p>
              {["PENDING", "PROCESSING"].includes(item.status) && (
                <form action={dispatchGovernmentSubmit}>
                  <input type="hidden" name="outboxId" value={item.id} />
                  <SubmitButton pendingText={dictionary[locale].working}>{t.dispatch}</SubmitButton>
                </form>
              )}
              {app && events.map((kind) => (
                <form key={kind} action={emitSyntheticRtoEvent}>
                  <input type="hidden" name="applicationId" value={app.id} />
                  <input type="hidden" name="kind" value={kind} />
                  <input type="hidden" name="intentKey" value={stableIntentKey({ actorId: operator.userId, scope: `application:${app.id}`, command: `Emit${kind}`, aggregateVersion: app.aggregateVersion })} />
                  <SubmitButton pendingText={dictionary[locale].working}>{simulatorLabel(locale, kind)}</SubmitButton>
                </form>
              ))}
            </li>
          );
        })}
      </ul>
      <section>
        {followups.map((item) => (
          <form key={item.id} action={dispatchFollowupOutbox}>
            <input type="hidden" name="outboxId" value={item.id} />
            <SubmitButton pendingText={dictionary[locale].working}>{followupLabel(locale, item.kind)}</SubmitButton>
          </form>
        ))}
      </section>
      <section>
        <h2>{pt.title}</h2>
        {attempts.map((attempt) => {
          const kinds = allowedPaymentSimulatorKinds(attempt.status, attempt.payment.reconciliations.length > 0);
          return (
            <div key={attempt.id}>
              <p>{paymentStatusLabel(locale, attempt.payment.status)}</p>
              {kinds.map((kind) => (
                <form key={kind} action={emitSyntheticPaymentEvent}>
                  <input type="hidden" name="attemptId" value={attempt.id} />
                  <input type="hidden" name="eventKind" value={kind} />
                  <input type="hidden" name="intentKey" value={stableIntentKey({ actorId: operator.userId, scope: `payment-attempt:${attempt.id}`, command: `EmitPayment${kind}`, aggregateVersion: attempt.payment.application.aggregateVersion })} />
                  <SubmitButton pendingText={dictionary[locale].working}>{pt.emit}: {simulatorLabel(locale, kind)}</SubmitButton>
                </form>
              ))}
            </div>
          );
        })}
      </section>
    </>
  );
}
