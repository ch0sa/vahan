import type { Locale } from "../i18n";

export const prototypeIdentityDisclosure = "Prototype authentication only: it signs in to a synthetic MoveKA account. It does not verify Aadhaar, VAHAN ownership, a government identity, or phone ownership.";
const disclosures: Record<Locale, string> = {
  en: prototypeIdentityDisclosure,
  kn: "ಇದು ಮಾದರಿ ದೃಢೀಕರಣ ಮಾತ್ರ: ಇದು ಸಿಂಥೆಟಿಕ್ MoveKA ಖಾತೆಗೆ ಸೈನ್ ಇನ್ ಮಾಡುತ್ತದೆ. ಇದು Aadhaar, VAHAN ಮಾಲೀಕತ್ವ, ಸರ್ಕಾರಿ ಗುರುತು ಅಥವಾ ಫೋನ್ ಮಾಲೀಕತ್ವವನ್ನು ಪರಿಶೀಲಿಸುವುದಿಲ್ಲ.",
};
export function identityDisclosure(locale: Locale) { return disclosures[locale]; }
