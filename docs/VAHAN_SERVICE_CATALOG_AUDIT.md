# VAHAN Karnataka citizen-service catalogue audit

Observed on 21 August 2026 from the user-supplied VAHAN Citizen Services URL for Karnataka, using the user-supplied fake registration `KA049999`. This is a research snapshot, not a policy source embedded into MoveKA. Availability, authentication, documents, fees, inspections and office visits may vary by state, RTO, vehicle and later portal changes.

## Entry and navigation patterns observed

- Entry by vehicle registration number or registering authority.
- State and RTO context is resolved before the service catalogue.
- Privacy-policy and terms acceptance precedes service access.
- Prominent security advisory and official-domain warning.
- Separate links for payment status, receipt verification, feedback/complaint and new registration.
- Authentication guidance distinguishes Aadhaar and mobile modes, RTO verification/approval, auto-approval and non-contactless journeys. MoveKA does not encode these observations as eligibility rules.
- The in-service shell exposes Home, Services, Appointment, Other Services, Download Document and Status.
- The seller transfer entry asks for the registration number, last five chassis characters and insurance-valid-until or PUCC-up-to-date information before `Verify Details`. MoveKA does not collect or verify those values in the prototype.

## Service catalogue observed

### RC Related Services

1. Apply for - Transfer of Ownership (Seller)
2. Apply for - Transfer of Ownership (Buyer)
3. Transfer of Ownership by Succession
4. Change of Address (BH Series Only)
5. Change of Address (State Series Only)
6. RC Surrender
7. Hypothecation Addition
8. Hypothecation Termination
9. Re-Assignment of Vehicle (To State Series)
10. Re-Assignment of Vehicle (To Vintage Series)
11. Application for No Objection Certificate
12. Application for Duplicate RC
13. Renewal of Registration

### Tax/Fee Services

1. Pay Your Tax

### Vehicle Related Services

1. Alteration of Vehicle
2. Fitness Renewal / Re-Apply After Fitness Being Failed

### Apply for Certificates

1. RC Particulars
2. Duplicate Fitness Certificate

### Additional Services

1. Update Mobile Number
2. Withdrawal of Application
3. eSign by Seller

## MoveKA product decisions

- Preserve all 21 observed entries as a searchable catalogue so citizens can begin in plain language.
- Label only seller and buyer ownership transfer as working synthetic journeys.
- Label withdrawal as an action available only in an eligible active synthetic case.
- Keep every other entry as a guided preview until its architecture, statutory boundary, authoritative requirements and acceptance tests are separately approved.
- Never infer documents, fees, deadlines, eligibility, Aadhaar requirements, inspection requirements, contactless status or RTO outcome from the service name.
- Add a real product shell: landing page, demo registration, sign-in/enrollment, dashboard, account/security, service catalogue and service-detail pages.
- Retain persistent prototype/non-authoritative disclosure and make the selected synthetic vehicle explicit.

Source reviewed: `https://vahan.parivahan.gov.in/vahanservice/vahan/ui/statevalidation/homepage.xhtml?statecd=Mzc2MzM2MzAzNjY0MzIzODM3NjIzNjY0MzY2MjM3NGI0MQ==`
