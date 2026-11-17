import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const next = requestUrl.searchParams.get("next");
  const safeNext = next && next.startsWith("/") && !next.startsWith("//") ? next : "/dashboard";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      const { data: { user } } = await supabase.auth.getUser();
      if (user && safeNext === "/dashboard" && user.user_metadata?.organization_name) {
        const { data: memberships } = await supabase
          .from("memberships")
          .select("id")
          .eq("user_id", user.id)
          .limit(1);
        if (!memberships?.length) {
          await supabase.rpc("create_personal_organization", {
            org_name: String(user.user_metadata.organization_name),
          });
        }
      }
      return NextResponse.redirect(new URL(safeNext, requestUrl.origin));
    }
  }

  return NextResponse.redirect(new URL("/login?error=auth_callback", requestUrl.origin));
}
