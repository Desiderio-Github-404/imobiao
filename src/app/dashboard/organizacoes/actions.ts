"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ACTIVE_ORGANIZATION_COOKIE_NAME } from "@/lib/organization";

export async function selectOrganization(formData: FormData) {
  const organizationId = String(formData.get("organization_id") ?? "");
  if (!/^[0-9a-f-]{36}$/i.test(organizationId)) {
    redirect("/dashboard/organizacoes?erro=organizacao-invalida");
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: membership } = await supabase
    .from("memberships")
    .select("organization_id")
    .eq("user_id", user.id)
    .eq("organization_id", organizationId)
    .maybeSingle();

  if (!membership) {
    redirect("/dashboard/organizacoes?erro=sem-permissao");
  }

  const cookieStore = await cookies();
  cookieStore.set(ACTIVE_ORGANIZATION_COOKIE_NAME, organizationId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });

  redirect("/dashboard");
}
