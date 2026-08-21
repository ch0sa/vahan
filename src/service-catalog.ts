export type ServiceCategory = "RC services" | "Tax & fees" | "Vehicle services" | "Certificates" | "Additional services";
export type PrototypeAvailability = "working-demo" | "guided-preview" | "case-action";

export type CitizenService = {
  slug: string;
  title: string;
  shortTitle: string;
  category: ServiceCategory;
  summary: string;
  availability: PrototypeAvailability;
  actionHref?: string;
  accent: string;
};

export const serviceCategories: { name: ServiceCategory; description: string; icon: string }[] = [
  { name: "RC services", description: "Ownership, address, finance, registration and NOC journeys", icon: "RC" },
  { name: "Tax & fees", description: "Understand and track vehicle tax or fee-related journeys", icon: "₹" },
  { name: "Vehicle services", description: "Alteration and fitness-related service journeys", icon: "V" },
  { name: "Certificates", description: "Request vehicle particulars and certificate-related services", icon: "C" },
  { name: "Additional services", description: "Account, withdrawal and seller-signing support", icon: "+" },
];

export const citizenServices: CitizenService[] = [
  { slug: "transfer-ownership-seller", title: "Transfer of ownership — seller", shortTitle: "Sell or transfer a vehicle", category: "RC services", summary: "Start the seller side of a synthetic ownership-transfer case and securely hand it to the buyer.", availability: "working-demo", actionHref: "/seller", accent: "blue" },
  { slug: "transfer-ownership-buyer", title: "Transfer of ownership — buyer", shortTitle: "Accept a vehicle transfer", category: "RC services", summary: "Review a seller invitation, confirm synthetic buyer information and continue the shared case.", availability: "working-demo", actionHref: "/buyer", accent: "violet" },
  { slug: "transfer-by-succession", title: "Transfer of ownership by succession", shortTitle: "Transfer by succession", category: "RC services", summary: "Understand the service path for a succession-related ownership change before using an official channel.", availability: "guided-preview", accent: "amber" },
  { slug: "change-address-bh", title: "Change of address — BH series", shortTitle: "Change BH-series address", category: "RC services", summary: "A guided preview for updating the recorded address of a BH-series vehicle.", availability: "guided-preview", accent: "teal" },
  { slug: "change-address-state", title: "Change of address — state series", shortTitle: "Change state-series address", category: "RC services", summary: "A guided preview for updating the recorded address of a state-series vehicle.", availability: "guided-preview", accent: "teal" },
  { slug: "rc-surrender", title: "RC surrender", shortTitle: "Surrender an RC", category: "RC services", summary: "Explore the high-level stages of an RC surrender request without making an official submission.", availability: "guided-preview", accent: "rose" },
  { slug: "hypothecation-addition", title: "Hypothecation addition", shortTitle: "Add vehicle finance", category: "RC services", summary: "Understand the coordination points involved in adding a financier relationship to an RC.", availability: "guided-preview", accent: "blue" },
  { slug: "hypothecation-termination", title: "Hypothecation termination", shortTitle: "Remove vehicle finance", category: "RC services", summary: "Understand the coordination points involved in ending a recorded financier relationship.", availability: "guided-preview", accent: "blue" },
  { slug: "reassignment-state-series", title: "Re-assignment to state series", shortTitle: "Move to a state series", category: "RC services", summary: "Preview the journey for re-assigning a vehicle registration to a state series.", availability: "guided-preview", accent: "violet" },
  { slug: "reassignment-vintage-series", title: "Re-assignment to vintage series", shortTitle: "Move to a vintage series", category: "RC services", summary: "Preview the journey for re-assigning an eligible vehicle to a vintage series without asserting eligibility.", availability: "guided-preview", accent: "violet" },
  { slug: "no-objection-certificate", title: "No Objection Certificate", shortTitle: "Apply for an NOC", category: "RC services", summary: "Explore an NOC application journey and the external decision boundary.", availability: "guided-preview", accent: "amber" },
  { slug: "duplicate-rc", title: "Duplicate RC", shortTitle: "Request a duplicate RC", category: "RC services", summary: "Preview how a duplicate RC request could be prepared and tracked.", availability: "guided-preview", accent: "amber" },
  { slug: "registration-renewal", title: "Renewal of registration", shortTitle: "Renew registration", category: "RC services", summary: "Preview a registration-renewal journey without calculating official eligibility, fees or dates.", availability: "guided-preview", accent: "teal" },
  { slug: "pay-tax", title: "Pay your tax", shortTitle: "Vehicle tax", category: "Tax & fees", summary: "Understand the payment and receipt-tracking stages without collecting bank or card details.", availability: "guided-preview", accent: "green" },
  { slug: "vehicle-alteration", title: "Alteration of vehicle", shortTitle: "Vehicle alteration", category: "Vehicle services", summary: "Preview the hand-offs and physical-verification boundary for a vehicle alteration request.", availability: "guided-preview", accent: "rose" },
  { slug: "fitness-renewal", title: "Fitness renewal or re-apply after failure", shortTitle: "Fitness renewal", category: "Vehicle services", summary: "Explore a fitness-related journey while keeping inspection and approval outside MoveKA.", availability: "guided-preview", accent: "rose" },
  { slug: "rc-particulars", title: "RC particulars", shortTitle: "Request RC particulars", category: "Certificates", summary: "Preview a request for RC particulars and track the resulting external status.", availability: "guided-preview", accent: "blue" },
  { slug: "duplicate-fitness-certificate", title: "Duplicate fitness certificate", shortTitle: "Duplicate fitness certificate", category: "Certificates", summary: "Preview a duplicate fitness-certificate request without fabricating certificate data.", availability: "guided-preview", accent: "blue" },
  { slug: "update-mobile", title: "Update mobile number", shortTitle: "Update mobile number", category: "Additional services", summary: "Understand the official account-update boundary; MoveKA does not update government contact data.", availability: "guided-preview", accent: "teal" },
  { slug: "withdraw-application", title: "Withdrawal of application", shortTitle: "Withdraw an application", category: "Additional services", summary: "Request withdrawal from an eligible synthetic case and wait for external confirmation.", availability: "case-action", actionHref: "/dashboard", accent: "rose" },
  { slug: "seller-esign", title: "eSign by seller", shortTitle: "Seller signing step", category: "Additional services", summary: "Understand the seller-signing checkpoint. MoveKA’s demo confirmation is not a government eSign.", availability: "guided-preview", accent: "violet" },
];

export function serviceBySlug(slug: string) {
  return citizenServices.find((service) => service.slug === slug);
}

export const serviceAuditNote = {
  sourceLabel: "VAHAN Citizen Services — Karnataka / Bengaluru North RTO",
  observedAt: "21 August 2026",
  caveat: "Catalogue availability, authentication mode, documents, fees and office visits can change by state, RTO, vehicle and policy. MoveKA does not treat this research snapshot as an authoritative rule set.",
};
