import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

const ACTIVE_ORGANIZATION_COOKIE = "imobiao_active_organization";

export async function getActiveOrganization() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: memberships, error } = await supabase
    .from("memberships")
    .select("organization_id, role, organizations(name)")
    .eq("user_id", user.id)
    .order("created_at", { ascending: true });

  if (error || !memberships || memberships.length === 0) {
    redirect("/dashboard?erro=sem-organizacao");
  }

  const cookieStore = await cookies();
  const selectedId = cookieStore.get(ACTIVE_ORGANIZATION_COOKIE)?.value;
  const selected = selectedId
    ? memberships.find((item) => item.organization_id === selectedId)
    : null;

  if (selected) {
    return { supabase, user, membership: selected };
  }

  if (memberships.length === 1) {
    cookieStore.set(ACTIVE_ORGANIZATION_COOKIE, memberships[0].organization_id, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
    });
    return { supabase, user, membership: memberships[0] };
  }

  redirect("/dashboard/organizacoes");
}

export const ACTIVE_ORGANIZATION_COOKIE_NAME = ACTIVE_ORGANIZATION_COOKIE;
