import { getAuthSession } from "@/lib/auth";
import { db } from "@/lib/db";

/**
 * Returns the session when the logged-in user is an admin.
 * The role is checked fresh from the database on every call so role changes
 * apply immediately without waiting for the user's token to refresh.
 */
export async function getAdminSession() {
  const session = await getAuthSession();
  if (!session?.user?.id) {
    return { status: 401 as const, session: null, role: null };
  }

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: { role: true },
  });

  if (!user || user.role !== "admin") {
    return { status: 403 as const, session: null, role: user?.role ?? null };
  }

  return { status: 200 as const, session, role: "admin" as const };
}

/**
 * Returns the session when the logged-in user is either an admin or a moderator.
 * Moderators have read-only access to users/projects and can review/resolve reports.
 */
export async function getStaffSession() {
  const session = await getAuthSession();
  if (!session?.user?.id) {
    return { status: 401 as const, session: null, role: null };
  }

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: { role: true },
  });

  if (!user || (user.role !== "admin" && user.role !== "moderator")) {
    return { status: 403 as const, session: null, role: user?.role ?? null };
  }

  return { status: 200 as const, session, role: user.role as "admin" | "moderator" };
}

