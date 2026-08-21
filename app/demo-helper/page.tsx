import { signIn } from "@/app/auth/actions";
import { isDemoMode } from "@/src/identity/config";
import { cookies } from "next/headers";
import { localeFrom, routeText } from "@/src/i18n";
import { SubmitButton } from "@/app/components";

export const dynamic = "force-dynamic";

export default async function DemoHelperPage() {
  const locale = localeFrom((await cookies()).get("moveka_locale")?.value); const t = routeText[locale];
  if (!isDemoMode()) return <><h1>{t.unavailable}</h1><p role="alert" aria-live="assertive">{t.disabled}</p></>;
  return <div className="auth-shell"><div className="auth-intro"><p className="eyebrow">Ownership transfer demo</p><h1>Choose your role</h1><p>Start as Ananya, the seller, or continue as Rahul, the buyer.</p></div><div className="auth-card"><h2>Who are you?</h2><p className="demo-note">Password: <strong>admin</strong>. It is only a prototype access code; do not reuse a real password.</p><form action={signIn} className="role-choice"><input type="hidden" name="userId" value="synthetic-ananya-rao" /><div><span className="avatar">AR</span><strong>Ananya Rao</strong><small>Registered owner · seller</small></div><label htmlFor="helper-seller-password">Demo password<input id="helper-seller-password" name="password" type="password" autoComplete="current-password" maxLength={128} required /></label><SubmitButton>Continue as seller</SubmitButton></form><form action={signIn} className="role-choice"><input type="hidden" name="userId" value="synthetic-rahul-shetty" /><div><span className="avatar violet">RS</span><strong>Rahul Shetty</strong><small>New owner · buyer</small></div><label htmlFor="helper-buyer-password">Demo password<input id="helper-buyer-password" name="password" type="password" autoComplete="current-password" maxLength={128} required /></label><SubmitButton>Continue as buyer</SubmitButton></form><p className="privacy-note">Demo accounts use sample data. No government account is accessed.</p></div></div>;
}
