import Link from "next/link";
import { notFound } from "next/navigation";
import { citizenServices, serviceAuditNote, serviceBySlug } from "@/src/service-catalog";

export function generateStaticParams() { return citizenServices.map(({ slug }) => ({ slug })); }

export default async function ServiceDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const service = serviceBySlug((await params).slug);
  if (!service) notFound();
  const canStart = Boolean(service.actionHref);
  return <div className="page-shell service-detail">
    <nav className="breadcrumbs" aria-label="Breadcrumb"><Link href="/">Home</Link><span aria-hidden>/</span><Link href="/services">Services</Link><span aria-hidden>/</span><span>{service.shortTitle}</span></nav>
    <div className="detail-hero">
      <div><p className="eyebrow">{service.category}</p><h1>{service.title}</h1><p className="lede">{service.summary}</p></div>
      <div className={`detail-status ${service.availability}`}><span aria-hidden>{canStart ? "✓" : "i"}</span><div><strong>{service.availability === "working-demo" ? "Working demo journey" : service.availability === "case-action" ? "Available inside an eligible case" : "Guidance only"}</strong><p>{canStart ? "Uses sample accounts and simulated external steps." : "This service is not yet implemented as a transaction."}</p></div></div>
    </div>
    <div className="detail-grid">
      <section className="content-card"><p className="section-kicker">How MoveKA would help</p><h2>A clear journey before any official action</h2><ol className="step-list"><li><span>1</span><div><strong>Choose the right service</strong><p>Understand the purpose and whether you are acting as owner, buyer or another participant.</p></div></li><li><span>2</span><div><strong>Check the vehicle details</strong><p>MoveKA can demonstrate readiness, but it cannot verify official eligibility or registry data.</p></div></li><li><span>3</span><div><strong>Prepare with confidence</strong><p>Official documents, fees and visit requirements must come from the authoritative portal or RTO.</p></div></li><li><span>4</span><div><strong>Track every hand-off</strong><p>A case timeline separates saved progress, external submission, approval and registry completion.</p></div></li></ol></section>
      <aside className="side-card"><h2>Before you continue</h2><ul className="check-list"><li>No live VAHAN lookup occurs.</li><li>No Aadhaar or payment details are collected.</li><li>No official eligibility, fee or timeline is calculated.</li><li>Only sample data is used.</li></ul>{canStart ? <Link className="button-link" href={service.actionHref!}>Start working demo <span aria-hidden>→</span></Link> : <Link className="button-link secondary" href="/auth/register">Choose a demo role</Link>}</aside>
    </div>
    <div className="research-note compact"><span className="note-icon" aria-hidden>i</span><div><strong>Source boundary</strong><p>This service name was observed on {serviceAuditNote.sourceLabel} on {serviceAuditNote.observedAt}. {serviceAuditNote.caveat}</p></div></div>
  </div>;
}
