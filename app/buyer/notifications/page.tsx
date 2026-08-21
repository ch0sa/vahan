import { requireCurrentSession } from "@/src/identity/access";
import { requireDemoMode } from "@/src/identity/config";
import { syntheticBuyerId } from "@/src/domain/buyer-flow";
import { prisma } from "@/src/lib/prisma";
import { cookies } from "next/headers";
import { localeFrom } from "@/src/i18n";
import { buyerNotice, buyerNotificationHref, buyerText } from "@/src/buyer-ui";
import { SubmitButton } from "@/app/components";
import { sellerErrorMessage } from "@/src/domain/seller-errors";
import { openNotificationApplication } from "./actions";

export const dynamic = "force-dynamic";

export default async function BuyerNotificationsPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  requireDemoMode();
  const session = await requireCurrentSession();
  const locale = localeFrom((await cookies()).get("moveka_locale")?.value); const t = buyerText[locale];
  const error = sellerErrorMessage((await searchParams).error, locale);
  if (session.userId !== syntheticBuyerId) return <><h1>{t.notifications}</h1><p role="alert">{t.none}</p></>;
  const notifications = await prisma.notification.findMany({ where: { userId: session.userId, OR: [{ applicationId: null }, { application: { participants: { some: { userId: session.userId, role: "BUYER" } } } }] }, orderBy: { id: "desc" }, take: 20 });
  return <><h1>{t.notifications}</h1>{error && <p role="alert" aria-live="assertive" tabIndex={-1}>{error}</p>}<p>{t.warning}</p>{notifications.length === 0 ? <p>{t.empty}</p> : <ul>{notifications.map((notification) => {
    const href = buyerNotificationHref(notification.applicationId, notification.href);
    const message = buyerNotice(locale, notification.message);
    return <li key={notification.id}>{notification.applicationId ? <form action={openNotificationApplication}><input type="hidden" name="applicationId" value={notification.applicationId}/><SubmitButton pendingText={locale === "kn" ? "ತೆರೆಯಲಾಗುತ್ತಿದೆ…" : "Opening…"}>{message}</SubmitButton></form> : href ? <a href={href}>{message}</a> : message}</li>;
  })}</ul>}<p><a href="/buyer">{t.back}</a></p></>;
}
