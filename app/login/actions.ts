"use server"

import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { createSessionToken, verifyPassword, SESSION_COOKIE, SESSION_MAX_AGE } from "@/lib/session"

export async function login(_prevState: { error?: string }, formData: FormData) {
  const password = String(formData.get("password") ?? "")

  if (!verifyPassword(password)) {
    return { error: "Incorrect password. Please try again." }
  }

  const token = await createSessionToken()
  const cookieStore = await cookies()
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE,
  })

  redirect("/")
}

export async function logout() {
  const cookieStore = await cookies()
  cookieStore.delete(SESSION_COOKIE)
  redirect("/login")
}
