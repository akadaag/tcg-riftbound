import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Email confirmation callback.
 * Supabase redirects here after the user clicks the confirm link in their email.
 * We exchange the auth code for a session and redirect to the home page.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      return NextResponse.redirect(new URL(next, request.url));
    }
  }

  // If there's no code or exchange failed, redirect to login with error hint
  return NextResponse.redirect(
    new URL("/login?error=confirmation_failed", request.url),
  );
}
