import Link from "next/link";
import { cookies } from "next/headers";
import { requireCurrentSession } from "@/src/identity/access";
import { localeFrom } from "@/src/i18n";
import { signOut } from "@/app/auth/actions";
import { SubmitButton } from "@/app/components";

export const dynamic = "force-dynamic";

export default async function AccountPage() {
  const session = await requireCurrentSession();
  const locale = localeFrom((await cookies()).get("moveka_locale")?.value);
  return <div className="page-shell"><nav className="breadcrumbs" aria-label="Breadcrumb"><Link href="/dashboard">Dashboard</Link><span aria-hidden>/</span><span>Account</span></nav><div className="page-heading"><p className="eyebrow">Account</p><h1>Your profile and security</h1><p className="lede">Manage your language, sign-in and current session.</p></div><div className="account-grid"><section className="content-card profile-card"><span className="avatar xlarge">{session.user.displayName.split(" ").map((part) => part[0]).join("")}</span><div><h2>{session.user.displayName}</h2><p>{session.user.role === "DEMO_OPERATOR" ? "Demo operator" : session.userId === "synthetic-ananya-rao" ? "Registered owner · seller" : "New owner · buyer"}</p><span className="status-pill success">Account active</span><p><Link className="button-link secondary" href="/demo-helper">Switch account</Link></p><form action={signOut}><SubmitButton pendingText="Signing out…">Sign out</SubmitButton></form></div></section><section className="content-card"><p className="section-kicker">Preferences</p><dl className="detail-list"><div><dt>Language</dt><dd>{locale === "kn" ? "Kannada" : "English"}</dd></div><div><dt>Data</dt><dd>Sample data</dd></div></dl></section><section className="content-card"><p className="section-kicker">Security</p><dl className="detail-list"><div><dt>Access</dt><dd>{session.user.role === "DEMO_OPERATOR" ? "Internal demo access" : "Shared demo password"}</dd></div><div><dt>Session</dt><dd>Active on this browser</dd></div></dl><p className="muted">For separate seller and buyer sessions, use a normal window and a private window.</p></section><section className="content-card danger-soft"><p className="section-kicker">Privacy</p><h2>No real personal data needed</h2><p>Do not enter Aadhaar, phone, bank, chassis or document details in this demo.</p></section></div></div>;
}
