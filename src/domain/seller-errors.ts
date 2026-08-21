export const sellerErrorCodes = ["registry-unavailable", "refresh", "totp-retry", "totp-locked", "configuration", "access", "invalid", "server"] as const;
export type SellerErrorCode = typeof sellerErrorCodes[number];
export function sellerErrorCode(error: unknown): SellerErrorCode {
  const message = error instanceof Error ? error.message : "";
  if (/locked/i.test(message)) return "totp-locked";
  if (/authenticator|code/i.test(message)) return "totp-retry";
  if (/vehicle projection|registry/i.test(message)) return "registry-unavailable";
  if (/changed|refresh|stale/i.test(message)) return "refresh";
  if (/configuration|rule/i.test(message)) return "configuration";
  if (/cannot access|seller/i.test(message)) return "access";
  if (/idempotency|intent|validation|invalid/i.test(message)) return "invalid";
  return "server";
}
export function sellerErrorMessage(code?: string, locale: "en" | "kn" = "en") {
  const messages: Record<"en" | "kn", Record<SellerErrorCode, string>> = { en: {
    "registry-unavailable": "The synthetic vehicle projection is unavailable. Refresh and try again.", refresh: "This transfer changed. Refresh the page and review the latest status.", "totp-retry": "That prototype authenticator code was not accepted. Wait for a new code and try again.", "totp-locked": "Too many incorrect prototype codes. Wait a minute before trying again.", configuration: "This synthetic demo rule is unavailable. Return to the demo helper and try later.", access: "You cannot perform that seller action for this transfer.", invalid: "That request could not be reused or validated. Refresh and try again.", server: "We could not save that seller step. Your existing progress is unchanged; refresh and try again."
  }, kn: {
    "registry-unavailable": "ಸಿಂಥೆಟಿಕ್ ವಾಹನ ಪ್ರಕ್ಷೇಪಣ ಲಭ್ಯವಿಲ್ಲ. ಪುಟವನ್ನು ಮರುಲೋಡ್ ಮಾಡಿ ಮತ್ತೆ ಪ್ರಯತ್ನಿಸಿ.", refresh: "ಈ ವರ್ಗಾವಣೆ ಬದಲಾಗಿದೆ. ಪುಟವನ್ನು ಮರುಲೋಡ್ ಮಾಡಿ ಇತ್ತೀಚಿನ ಸ್ಥಿತಿಯನ್ನು ಪರಿಶೀಲಿಸಿ.", "totp-retry": "ಆ ಮಾದರಿ ದೃಢೀಕರಣ ಕೋಡ್ ಸ್ವೀಕರಿಸಲಿಲ್ಲ. ಹೊಸ ಕೋಡ್‌ಗಾಗಿ ಕಾಯಿರಿ ಮತ್ತು ಮತ್ತೆ ಪ್ರಯತ್ನಿಸಿ.", "totp-locked": "ಬಹಳಷ್ಟು ತಪ್ಪು ಮಾದರಿ ಕೋಡ್‌ಗಳು. ಒಂದು ನಿಮಿಷ ಕಾಯಿರಿ.", configuration: "ಈ ಸಿಂಥೆಟಿಕ್ ಡೆಮೊ ನಿಯಮ ಲಭ್ಯವಿಲ್ಲ. ಡೆಮೊ ಸಹಾಯಕಕ್ಕೆ ಮರಳಿ ನಂತರ ಪ್ರಯತ್ನಿಸಿ.", access: "ಈ ವರ್ಗಾವಣೆಗೆ ಆ ಮಾರಾಟಗಾರ ಕ್ರಮವನ್ನು ನೀವು ಕೈಗೊಳ್ಳಲು ಸಾಧ್ಯವಿಲ್ಲ.", invalid: "ಆ ವಿನಂತಿಯನ್ನು ಮರುಬಳಕೆ ಅಥವಾ ಪರಿಶೀಲಿಸಲು ಸಾಧ್ಯವಾಗಲಿಲ್ಲ. ಮರುಲೋಡ್ ಮಾಡಿ.", server: "ಆ ಮಾರಾಟಗಾರ ಹಂತವನ್ನು ಉಳಿಸಲು ಸಾಧ್ಯವಾಗಲಿಲ್ಲ. ನಿಮ್ಮ ಹಿಂದಿನ ಪ್ರಗತಿ ಬದಲಾಗಿಲ್ಲ; ಮರುಲೋಡ್ ಮಾಡಿ."
  } };
  return sellerErrorCodes.includes(code as SellerErrorCode) ? messages[locale][code as SellerErrorCode] : undefined;
}
