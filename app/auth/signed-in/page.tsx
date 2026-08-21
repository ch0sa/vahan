import { signOut } from "@/app/auth/actions";
import { identityDisclosure } from "@/src/identity/disclosure";
import { requireCurrentSession } from "@/src/identity/access";
import { prisma } from "@/src/lib/prisma";
import { cookies } from "next/headers";
import { dictionary, localeFrom, routeText } from "@/src/i18n";
import { SubmitButton } from "@/app/components";
export const dynamic = "force-dynamic";
export default async function SignedInPage() { const locale=localeFrom((await cookies()).get("moveka_locale")?.value),t=routeText[locale],session=await requireCurrentSession(), destination=session.user.role==="DEMO_OPERATOR"?"/demo/backoffice":session.userId==="synthetic-rahul-shetty"?"/buyer":"/seller"; const caseApplication=session.user.role==="CITIZEN"?await prisma.application.findFirst({where:{participants:{some:{userId:session.userId}}},orderBy:{updatedAt:"desc"},select:{id:true}}):null; return <><h1>{t.signed}</h1><p role="status" aria-live="polite">{session.user.displayName}. {t.signedAs}</p><p>{identityDisclosure(locale)}</p><p><a href={destination}>{t.workspace}</a></p>{caseApplication&&<p><a href={`/case?application=${caseApplication.id}`}>{t.case}</a></p>}<form action={signOut}><SubmitButton pendingText={dictionary[locale].working}>{t.signout}</SubmitButton></form></>; }
