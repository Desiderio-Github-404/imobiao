"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getActiveOrganization } from "@/lib/organization";

export async function createUnit(formData: FormData) {
  const { supabase, membership } = await getActiveOrganization();

  const propertyId = String(formData.get("property_id") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const floor = String(formData.get("floor") ?? "").trim();
  const bedroomsRaw = String(formData.get("bedrooms") ?? "").trim();
  const bathroomsRaw = String(formData.get("bathrooms") ?? "").trim();
  const rentRaw = String(formData.get("monthly_rent") ?? "").trim();
  const status = String(formData.get("status") ?? "available");
  const notes = String(formData.get("notes") ?? "").trim();

  const allowedStatuses = ["available", "occupied", "maintenance", "inactive"];
  const monthlyRent = Number(rentRaw);
  const bedrooms = bedroomsRaw === "" ? null : Number(bedroomsRaw);
  const bathrooms = bathroomsRaw === "" ? null : Number(bathroomsRaw);

  if (!propertyId || name.length < 1 || name.length > 100 ||
      rentRaw === "" || !Number.isFinite(monthlyRent) || monthlyRent < 0 ||
      !allowedStatuses.includes(status) ||
      (bedrooms !== null && (!Number.isInteger(bedrooms) || bedrooms < 0 || bedrooms > 50)) ||
      (bathrooms !== null && (!Number.isFinite(bathrooms) || bathrooms < 0 || bathrooms > 50))) {
    redirect("/dashboard/unidades/novo?erro=dados-invalidos");
  }

  if (!["owner", "manager"].includes(membership.role)) redirect("/dashboard/unidades/novo?erro=sem-permissao");

  const { error } = await supabase.from("units").insert({
    organization_id: membership.organization_id,
    property_id: propertyId,
    name,
    floor: floor || null,
    bedrooms,
    bathrooms,
    monthly_rent: monthlyRent,
    status,
    notes: notes || null,
  });

  if (error) redirect("/dashboard/unidades/novo?erro=falha-registo");

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/unidades");
  revalidatePath("/dashboard/imoveis");
  redirect("/dashboard/unidades?sucesso=criado");
}
