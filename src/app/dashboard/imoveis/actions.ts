"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function createProperty(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const name = String(formData.get("name") ?? "").trim();
  const propertyType = String(formData.get("property_type") ?? "residential");
  const address = String(formData.get("address") ?? "").trim();
  const municipality = String(formData.get("municipality") ?? "").trim();
  const province = String(formData.get("province") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();

  const allowedTypes = ["residential", "commercial", "mixed", "land", "other"];
  if (name.length < 2 || name.length > 120 || !allowedTypes.includes(propertyType)) {
    redirect("/dashboard/imoveis/novo?erro=verifique-os-dados");
  }

  const { data: membership } = await supabase
    .from("memberships")
    .select("organization_id, role")
    .eq("user_id", user.id)
    .in("role", ["owner", "manager"])
    .limit(1)
    .maybeSingle();

  if (!membership) redirect("/dashboard/imoveis/novo?erro=sem-permissao");

  const { error } = await supabase.from("properties").insert({
    organization_id: membership.organization_id,
    name,
    property_type: propertyType,
    address: address || null,
    municipality: municipality || null,
    province: province || null,
    description: description || null,
  });

  if (error) redirect("/dashboard/imoveis/novo?erro=nao-foi-possivel-guardar");

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/imoveis");
  redirect("/dashboard/imoveis?sucesso=criado");
}
