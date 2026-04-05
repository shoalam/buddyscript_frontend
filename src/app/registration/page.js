import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import RegistrationPageClient from "./RegistrationPageClient";

export default async function RegistrationPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get("token")?.value;
  const refreshToken = cookieStore.get("refreshToken")?.value;

  // Redirect to feed if already logged in (any token present)
  if (token || refreshToken) {
    redirect("/feed");
  }

  return <RegistrationPageClient />;
}
