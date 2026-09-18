import { headers } from "next/headers";
import { auth } from "@/server/auth";

export async function getAuthenticatedUserId(): Promise<string | null> {
  const session = await auth.api.getSession({ headers: await headers() });
  return session?.user.id ?? null;
}
