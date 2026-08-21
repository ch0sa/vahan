import Link from "next/link";
import { signIn } from "@/app/auth/actions";
import { SubmitButton } from "@/app/components";
import { isDemoMode } from "@/src/identity/config";

export const dynamic = "force-dynamic";

export default function RegisterPage() {
  if (!isDemoMode()) return <div className="auth-shell"><div className="auth-card"><h1>Demo registration is unavailable</h1><p>This environment has demo mode disabled.</p></div></div>;
  return <div className="auth-shell"><div className="auth-intro"><Link className="back-link" href="/">← Back home</Link><p className="eyebrow">Start the demo</p><h1>Choose your role in the journey.</h1><p>Use a sample seller or buyer account—no real identity or vehicle information is needed.</p></div><div className="auth-card"><h2>Who are you?</h2><p className="demo-note">Password: <strong>admin</strong>. It is only a prototype access code; do not reuse a real password.</p><form action={signIn} className="role-choice"><input type="hidden" name="userId" value="synthetic-ananya-rao" /><div><span className="avatar blue">AR</span><strong>Ananya Rao</strong><small>Registered owner · seller</small></div><label htmlFor="seller-password">Demo password<input id="seller-password" name="password" type="password" autoComplete="current-password" maxLength={128} required /></label><SubmitButton>Continue as seller</SubmitButton></form><form action={signIn} className="role-choice"><input type="hidden" name="userId" value="synthetic-rahul-shetty" /><div><span className="avatar violet">RS</span><strong>Rahul Shetty</strong><small>New owner · buyer</small></div><label htmlFor="buyer-password">Demo password<input id="buyer-password" name="password" type="password" autoComplete="current-password" maxLength={128} required /></label><SubmitButton>Continue as buyer</SubmitButton></form></div></div>;
}
