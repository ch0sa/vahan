"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { citizenServices, serviceCategories, type ServiceCategory } from "@/src/service-catalog";

export function ServiceExplorer({ initialCategory = "All" }: { initialCategory?: ServiceCategory | "All" }) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<ServiceCategory | "All">(initialCategory);
  const filtered = useMemo(() => citizenServices.filter((service) => {
    const matchesCategory = category === "All" || service.category === category;
    const haystack = `${service.title} ${service.shortTitle} ${service.summary}`.toLowerCase();
    return matchesCategory && haystack.includes(query.trim().toLowerCase());
  }), [category, query]);

  return <>
    <div className="service-filters">
      <label className="search-field"><span>Find a service</span><input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Try transfer, RC, tax or fitness" /></label>
      <label><span>Category</span><select value={category} onChange={(event) => setCategory(event.target.value as ServiceCategory | "All")}><option>All</option>{serviceCategories.map((item) => <option key={item.name}>{item.name}</option>)}</select></label>
    </div>
    <p className="results-count" role="status">{filtered.length} service{filtered.length === 1 ? "" : "s"} shown</p>
    <div className="service-grid">{filtered.map((service) => <article className={`service-card accent-${service.accent}`} key={service.slug}>
      <div className="card-topline"><span className="service-category">{service.category}</span><span className={`availability ${service.availability}`}>{service.availability === "working-demo" ? "Working demo" : service.availability === "case-action" ? "Inside an active case" : "Guided preview"}</span></div>
      <h2><Link href={`/services/${service.slug}`}>{service.shortTitle}</Link></h2>
      <p>{service.summary}</p>
      <Link className="text-link" href={`/services/${service.slug}`}>View service <span aria-hidden>→</span></Link>
    </article>)}</div>
    {filtered.length === 0 && <div className="empty-state"><strong>No matching service</strong><p>Try a broader search or choose all categories.</p></div>}
  </>;
}
