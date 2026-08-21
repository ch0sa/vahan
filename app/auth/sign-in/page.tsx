import Link from "next/link";
import { cookies } from "next/headers";
import { signIn } from "@/app/auth/actions";
import { SubmitButton } from "@/app/components";
import { authErrorMessage } from "@/src/identity/errors";
import { isDemoMode } from "@/src/identity/config";
import { dictionary, localeFrom, routeText } from "@/src/i18n";

export const dynamic = "force-dynamic";

export default async function SignInPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const locale = localeFrom((await cookies()).get("moveka_locale")?.value);
  const t = routeText[locale];
  if (!isDemoMode()) return <div className="auth-shell"><div className="auth-card"><h1>{t.unavailable}</h1><p role="alert">{t.disabled}</p></div></div>;
  const message = authErrorMessage((await searchParams).error, locale);
  return <div className="auth-shell"><div className="auth-intro"><Link className="back-link" href="/">← Back home</Link><p className="eyebrow">Demo sign-in</p><h1>Choose a role and continue</h1><p>To keep both accounts signed in, open the seller in your normal browser window and the buyer in a private window.</p></div><div className="auth-card"><h2>Sign in to the demo</h2>{message && <p className="form-alert" role="alert" aria-live="assertive" tabIndex={-1}>{message}</p>}<form action={signIn}><label htmlFor="userId">Account</label><select id="userId" name="userId"><option value="synthetic-ananya-rao">Ananya Rao — seller</option><option value="synthetic-rahul-shetty">Rahul Shetty — buyer</option></select><label htmlFor="password">Demo password</label><input id="password" name="password" type="password" autoComplete="current-password" maxLength={128} required /><p className="demo-note">Password: <strong>admin</strong>. This is only a prototype access code—do not reuse a real password.</p><SubmitButton pendingText={dictionary[locale].working}>{t.submit} <span aria-hidden>→</span></SubmitButton></form><div className="auth-links"><Link href="/demo-helper">Choose a role</Link><span>Need a reminder? <Link href="/auth/register">View demo accounts</Link></span></div></div></div>;
}
