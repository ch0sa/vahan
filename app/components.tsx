"use client";
import { useFormStatus } from "react-dom";
import { setLocale } from "./locale-actions";
export function SubmitButton({ children, pendingText = "Working…" }: { children: React.ReactNode; pendingText?: string }) { const { pending } = useFormStatus(); return <button type="submit" disabled={pending} aria-disabled={pending}>{pending ? pendingText : children}</button>; }
export function LocaleSwitch({ locale, label, english, kannada }: { locale: "en" | "kn"; label: string; english: string; kannada: string }) { return <form action={setLocale}><label htmlFor="locale">{label}</label><select id="locale" name="locale" defaultValue={locale} onChange={(event) => event.currentTarget.form?.requestSubmit()}><option value="en">{english}</option><option value="kn">{kannada}</option></select></form>; }
