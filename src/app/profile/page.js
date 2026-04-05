import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getMeAction } from "../actions/authActions";
import ProfilePageClient from "./ProfilePageClient";

export default async function ProfilePage() {
  const cookieStore = await cookies();
  const token = cookieStore.get("token")?.value;
  const refreshToken = cookieStore.get("refreshToken")?.value;

  // Protect route
  if (!token && !refreshToken) {
    redirect("/login");
  }

  const { user, error } = await getMeAction();

  if (!user || error) {
    redirect("/login");
  }

  return <ProfilePageClient initialUser={user} />;
}
