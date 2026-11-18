"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

const allowedRoles = ["manager", "finance", "staff"];

async function requireOwner() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: membership } = await supabase.from("memberships")
    .select("organization_id,role").eq("user_id", user.id)
    .order("created_at", { ascending: true }).limit(1).maybeSingle();
  if (!membership || membership.role !== "owner") redirect("/dashboard?erro=sem-permissao");
  return supabase;
}

export async function addTeamMember(formData: FormData) {
  const supabase = await requireOwner();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const role = String(formData.get("role") ?? "");
  if (!/^\S+@\S+\.\S+$/.test(email) || !allowedRoles.includes(role)) {
    redirect("/dashboard/equipa?erro=dados-invalidos");
  }
  const { error } = await supabase.rpc("add_org_member", {
    p_email: email,
    p_role: role,
  });
  if (error) {
    const code = error.message.includes("No account exists") ? "conta-inexistente"
      : error.message.includes("already") ? "membro-existente"
      : "falha-adicao";
    redirect("/dashboard/equipa?erro=" + code);
  }
  revalidatePath("/dashboard/equipa");
  redirect("/dashboard/equipa?sucesso=adicionado");
}

export async function updateTeamMemberRole(formData: FormData) {
  const supabase = await requireOwner();
  const userId = String(formData.get("user_id") ?? "");
  const role = String(formData.get("role") ?? "");
  if (!/^[0-9a-f-]{36}$/i.test(userId) || !allowedRoles.includes(role)) {
    redirect("/dashboard/equipa?erro=dados-invalidos");
  }
  const { error } = await supabase.rpc("update_org_member_role", {
    p_user_id: userId,
    p_role: role,
  });
  if (error) redirect("/dashboard/equipa?erro=falha-actualizacao");
  revalidatePath("/dashboard/equipa");
  redirect("/dashboard/equipa?sucesso=actualizado");
}

export async function removeTeamMember(formData: FormData) {
  const supabase = await requireOwner();
  const userId = String(formData.get("user_id") ?? "");
  if (!/^[0-9a-f-]{36}$/i.test(userId)) redirect("/dashboard/equipa?erro=dados-invalidos");
  const { error } = await supabase.rpc("remove_org_member", { p_user_id: userId });
  if (error) redirect("/dashboard/equipa?erro=falha-remocao");
  revalidatePath("/dashboard/equipa");
  redirect("/dashboard/equipa?sucesso=removido");
}
