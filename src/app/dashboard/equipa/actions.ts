"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getActiveOrganization } from "@/lib/organization";

const allowedRoles = ["manager", "finance", "staff"];

async function requireOwner() {
  const { supabase, membership } = await getActiveOrganization();
  if (membership.role !== "owner") redirect("/dashboard?erro=sem-permissao");
  return { supabase, organizationId: membership.organization_id };
}

export async function addTeamMember(formData: FormData) {
  const { supabase, organizationId } = await requireOwner();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const role = String(formData.get("role") ?? "");
  if (!/^\S+@\S+\.\S+$/.test(email) || !allowedRoles.includes(role)) {
    redirect("/dashboard/equipa?erro=dados-invalidos");
  }
  const { error } = await supabase.rpc("add_org_member", {
    p_organization_id: organizationId,
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
  const { supabase, organizationId } = await requireOwner();
  const userId = String(formData.get("user_id") ?? "");
  const role = String(formData.get("role") ?? "");
  if (!/^[0-9a-f-]{36}$/i.test(userId) || !allowedRoles.includes(role)) {
    redirect("/dashboard/equipa?erro=dados-invalidos");
  }
  const { error } = await supabase.rpc("update_org_member_role", {
    p_organization_id: organizationId,
    p_user_id: userId,
    p_role: role,
  });
  if (error) redirect("/dashboard/equipa?erro=falha-actualizacao");
  revalidatePath("/dashboard/equipa");
  redirect("/dashboard/equipa?sucesso=actualizado");
}

export async function removeTeamMember(formData: FormData) {
  const { supabase, organizationId } = await requireOwner();
  const userId = String(formData.get("user_id") ?? "");
  if (!/^[0-9a-f-]{36}$/i.test(userId)) redirect("/dashboard/equipa?erro=dados-invalidos");
  const { error } = await supabase.rpc("remove_org_member", { p_organization_id: organizationId, p_user_id: userId });
  if (error) redirect("/dashboard/equipa?erro=falha-remocao");
  revalidatePath("/dashboard/equipa");
  redirect("/dashboard/equipa?sucesso=removido");
}
