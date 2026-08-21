import { ServiceExplorer } from "@/app/service-explorer";
import { serviceAuditNote, serviceCategories, type ServiceCategory } from "@/src/service-catalog";

export const metadata = { title: "Vehicle services | MoveKA" };

export default async function ServicesPage({ searchParams }: { searchParams: Promise<{ vehicle?: string; category?: string }> }) {
  const params = await searchParams;
  const selectedVehicle = params.vehicle?.toUpperCase() === "KA01AB1234";
  const initialCategory = serviceCategories.some((item) => item.name === params.category) ? params.category as ServiceCategory : "All";
  return <div className="page-shell">
    <div className="page-heading">
      <p className="eyebrow">Vehicle services</p>
      <h1>One place to understand what comes next.</h1>
      <p className="lede">Explore common vehicle services in one place. Ownership transfer is interactive; the remaining services are guided previews.</p>
    </div>
    <div className="research-note"><span className="note-icon" aria-hidden>i</span><div><strong>Research-backed, not government-connected</strong><p>Observed from {serviceAuditNote.sourceLabel} on {serviceAuditNote.observedAt}. {serviceAuditNote.caveat}</p></div></div>
    {selectedVehicle && <div className="selected-vehicle"><span className="vehicle-badge" aria-hidden>KA</span><div><small>Exploring services for</small><strong>KA01AB1234</strong></div><span className="verified-chip">Demo vehicle</span></div>}
    <ServiceExplorer initialCategory={initialCategory} />
  </div>;
}
