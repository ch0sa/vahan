import type { Metadata } from "next";
import { cookies } from "next/headers";
import "./globals.css";
import { LocaleSwitch } from "./components";
import Link from "next/link";
import { dictionary, localeFrom } from "@/src/i18n";
import { currentSession } from "@/src/identity/access";
import { signOut } from "./auth/actions";

export const metadata: Metadata = {
  title: "MoveKA — Citizen services, simplified",
  description: "A clear, accessible ownership-transfer journey for a fictional hackathon demonstration"
};

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const locale = localeFrom((await cookies()).get("moveka_locale")?.value); const t = dictionary[locale];
  const session = await currentSession().catch(() => null);
  return <html lang={locale} data-scroll-behavior="smooth"><body><a className="skip-link" href="#main">{t.skip}</a><header className="site-header"><div className="nav-container"><Link className="brand" href="/"><span className="brand-mark" aria-hidden>M</span><span>MoveKA<small>Citizen services, simplified</small></span></Link><nav className="primary-nav" aria-label="Primary navigation"><Link href="/">Home</Link><Link href="/services">Services</Link>{session && <Link href="/dashboard">Dashboard</Link>}</nav><div className="header-actions"><LocaleSwitch locale={locale} label={t.language} english={t.english} kannada={t.kannada}/>{session ? <><Link className="account-chip" href="/account"><span className="avatar tiny">{session.user.displayName.split(" ").map((part) => part[0]).join("")}</span><span>{session.user.displayName.split(" ")[0]}</span></Link><Link className="switch-account-link" href="/demo-helper">Switch account</Link><form action={signOut}><button className="nav-signout" type="submit">Sign out</button></form></> : <><Link className="login-link" href="/auth/sign-in">Log in</Link><Link className="header-cta" href="/demo-helper">Try the demo</Link></>}</div></div></header><nav className="mobile-nav" aria-label="Mobile navigation"><Link href="/">Home</Link><Link href="/services">Services</Link>{session ? <><Link href="/dashboard">Dashboard</Link><Link href="/account">Account</Link></> : <><Link href="/auth/sign-in">Log in</Link><Link href="/demo-helper">Try demo</Link></>}</nav><main id="main" tabIndex={-1}>{children}</main><footer className="site-footer compact-footer"><Link className="brand footer-brand" href="/"><span className="brand-mark" aria-hidden>M</span><span>MoveKA</span></Link><p>{t.prototype} · {t.synthetic}</p><nav aria-label="Footer navigation"><Link href="/services">Services</Link><Link href="/demo-helper">Demo accounts</Link></nav></footer></body></html>;
}
