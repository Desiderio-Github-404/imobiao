import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const next = requestUrl.searchParams.get("next");
  const safeNext = next && next.startsWith("/") && !next.startsWith("//") ? next : "/dashboard";
  const loginUrl = new URL("/login", requestUrl.origin);

  if (!code) {
    loginUrl.searchParams.set("error", "auth_callback");
    return NextResponse.redirect(loginUrl);
  }

  const supabase = await createClient();
  const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

  if (exchangeError) {
    loginUrl.searchParams.set("error", "auth_callback");
    return NextResponse.redirect(loginUrl);
  }

  const { data: { user }, error: userError } = await supabase.auth.getUser();

  if (userError || !user) {
    loginUrl.searchParams.set("error", "auth_callback");
    return NextResponse.redirect(loginUrl);
  }

  // Complete first-time onboarding only when this is a new account
  // carrying the organization name supplied during registration.
  const organizationName = String(user.user_metadata?.organization_name ?? "").trim();

  if (safeNext === "/dashboard" && organizationName.length >= 2) {
    const { data: membership, error: membershipError } = await supabase
      .from("memberships")
      .select("id")
      .eq("user_id", user.id)
      .limit(1)
      .maybeSingle();

    if (membershipError) {
      loginUrl.searchParams.set("error", "organization_check");
      return NextResponse.redirect(loginUrl);
    }

    if (!membership) {
      const { error: organizationError } = await supabase.rpc("create_personal_organization", {
        org_name: organizationName,
      });

      if (organizationError) {
        loginUrl.searchParams.set("error", "organization_setup");
        return NextResponse.redirect(loginUrl);
      }
    }
  }

  return NextResponse.redirect(new URL(safeNext, requestUrl.origin));
}
