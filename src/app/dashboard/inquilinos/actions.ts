"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getActiveOrganization } from "@/lib/organization";

export async function createTenant(formData: FormData) {
  const { supabase, membership } = await getActiveOrganization();

  const fullName = String(formData.get("full_name") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const identityDocument = String(formData.get("identity_document") ?? "").trim();
  const whatsappPhoneRaw = String(formData.get("whatsapp_phone") ?? "").trim();
  const whatsappEnabled = formData.get("whatsapp_notifications_enabled") === "on";
  const notes = String(formData.get("notes") ?? "").trim();
  const whatsappPhone = whatsappPhoneRaw.replace(/[\s().-]/g, "");

  if (fullName.length < 2 || fullName.length > 150 ||
      phone.length > 40 || email.length > 254 ||
      identityDocument.length > 80 || notes.length > 2000 ||
      (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) ||
      (whatsappPhone && !/^\+[1-9][0-9]{7,14}$/.test(whatsappPhone)) ||
      (whatsappEnabled && !whatsappPhone)) {
    redirect("/dashboard/inquilinos/novo?erro=dados-invalidos");
  }

  if (!["owner", "manager"].includes(membership.role)) redirect("/dashboard/inquilinos/novo?erro=sem-permissao");

  const { error } = await supabase.from("tenants").insert({
    organization_id: membership.organization_id,
    full_name: fullName,
    phone: phone || null,
    email: email || null,
    identity_document: identityDocument || null,
    whatsapp_phone: whatsappPhone || null,
    whatsapp_notifications_enabled: whatsappEnabled,
    notes: notes || null,
  });

  if (error) redirect("/dashboard/inquilinos/novo?erro=falha-registo");

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/inquilinos");
  redirect("/dashboard/inquilinos?sucesso=criado");
}
