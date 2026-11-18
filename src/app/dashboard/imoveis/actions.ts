"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getActiveOrganization } from "@/lib/organization";

export async function createProperty(formData: FormData) {
  const { supabase, membership } = await getActiveOrganization();

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

  if (!["owner", "manager"].includes(membership.role)) redirect("/dashboard/imoveis/novo?erro=sem-permissao");

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
