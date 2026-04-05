import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import LoginPageClient from "./LoginPageClient";

export default async function LoginPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get("token")?.value;
  const refreshToken = cookieStore.get("refreshToken")?.value;

  // Redirect to feed if already logged in (any token present)
  if (token || refreshToken) {
    redirect("/feed");
  }

  return <LoginPageClient />;
}
