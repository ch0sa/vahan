"use server";
import { cookies } from "next/headers";
import { localeFrom } from "@/src/i18n";
export async function setLocale(formData: FormData) { const locale = localeFrom(String(formData.get("locale") ?? "en")); (await cookies()).set("moveka_locale", locale, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 60 * 60 * 24 * 365 }); }
