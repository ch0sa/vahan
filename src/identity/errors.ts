import type { Locale } from "../i18n";

const messages = {
  en: {
    "session-required": "Your prototype session is unavailable or has expired. Sign in again.",
    "enrolled-account": "This demo account is already enrolled. Sign in with its authenticator code; the helper cannot reset it.",
    "enrollment-required": "Set up prototype authentication for this synthetic account first.",
    restart: "Your enrollment link expired or is no longer valid. Choose the synthetic account again to start over.",
    lockout: "Too many incorrect codes. Wait a minute, then try again.",
    replay: "That authenticator code was already used. Wait for the next code and try again.",
    verification: "We could not verify that code. Check your authenticator and try again.",
    "invalid-code": "Enter a six-digit authenticator code.",
    "invalid-password": "The selected demo account or shared demo password was not accepted.",
    generic: "We could not complete that prototype authentication step.",
  },
  kn: {
    "session-required": "ನಿಮ್ಮ ಮಾದರಿ ಸೆಷನ್ ಲಭ್ಯವಿಲ್ಲ ಅಥವಾ ಅವಧಿ ಮುಗಿದಿದೆ. ಮತ್ತೆ ಸೈನ್ ಇನ್ ಮಾಡಿ.",
    "enrolled-account": "ಈ ಡೆಮೊ ಖಾತೆ ಈಗಾಗಲೇ ನೋಂದಾಯಿಸಲಾಗಿದೆ. ಅದರ ದೃಢೀಕರಣ ಕೋಡ್ ಬಳಸಿ ಸೈನ್ ಇನ್ ಮಾಡಿ; ಸಹಾಯಕ ಅದನ್ನು ಮರುಹೊಂದಿಸಲು ಸಾಧ್ಯವಿಲ್ಲ.",
    "enrollment-required": "ಮೊದಲು ಈ ಸಿಂಥೆಟಿಕ್ ಖಾತೆಗೆ ಮಾದರಿ ದೃಢೀಕರಣ ಹೊಂದಿಸಿ.",
    restart: "ನಿಮ್ಮ ನೋಂದಣಿ ಲಿಂಕ್ ಅವಧಿ ಮುಗಿದಿದೆ ಅಥವಾ ಮಾನ್ಯವಿಲ್ಲ. ಮತ್ತೆ ಪ್ರಾರಂಭಿಸಲು ಸಿಂಥೆಟಿಕ್ ಖಾತೆಯನ್ನು ಆಯ್ಕೆಮಾಡಿ.",
    lockout: "ಬಹಳಷ್ಟು ತಪ್ಪು ಕೋಡ್‌ಗಳನ್ನು ನಮೂದಿಸಲಾಗಿದೆ. ಒಂದು ನಿಮಿಷ ಕಾಯಿರಿ, ನಂತರ ಮತ್ತೆ ಪ್ರಯತ್ನಿಸಿ.",
    replay: "ಆ ದೃಢೀಕರಣ ಕೋಡ್ ಈಗಾಗಲೇ ಬಳಸಲಾಗಿದೆ. ಮುಂದಿನ ಕೋಡ್‌ಗಾಗಿ ಕಾಯಿರಿ.",
    verification: "ಆ ಕೋಡ್ ಪರಿಶೀಲಿಸಲು ಸಾಧ್ಯವಾಗಲಿಲ್ಲ. ನಿಮ್ಮ ದೃಢೀಕರಣ ಸಾಧನವನ್ನು ಪರಿಶೀಲಿಸಿ ಮತ್ತೆ ಪ್ರಯತ್ನಿಸಿ.",
    "invalid-code": "ಆರು ಅಂಕಿಯ ದೃಢೀಕರಣ ಕೋಡ್ ನಮೂದಿಸಿ.",
    "invalid-password": "ಆಯ್ಕೆ ಮಾಡಿದ ಡೆಮೊ ಖಾತೆ ಅಥವಾ ಹಂಚಿದ ಡೆಮೊ ಪಾಸ್‌ವರ್ಡ್ ಸ್ವೀಕರಿಸಲಿಲ್ಲ.",
    generic: "ಆ ಮಾದರಿ ದೃಢೀಕರಣ ಹಂತವನ್ನು ಪೂರ್ಣಗೊಳಿಸಲು ಸಾಧ್ಯವಾಗಲಿಲ್ಲ.",
  },
} as const;

export function authErrorMessage(error?: string, locale: Locale = "en") {
  const localized = messages[locale];
  return error ? localized[error as keyof typeof localized] ?? localized.generic : undefined;
}
