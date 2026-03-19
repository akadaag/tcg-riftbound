import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Next.js 16 proxy (replaces middleware.ts).
 * Refreshes the Supabase JWT on every request so Server Components
 * always have a valid session.
 */
export async function proxy(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          // 1. Set on request so Server Components see fresh tokens
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          // 2. Recreate response with updated request
          supabaseResponse = NextResponse.next({ request });
          // 3. Set on response so browser gets fresh tokens
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // Validate JWT and refresh if expired.
  // IMPORTANT: use getClaims() not getSession() — getClaims validates the signature.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // If not authenticated and trying to access a protected route, redirect to login
  const isAuthPage = request.nextUrl.pathname.startsWith("/login");
  const isAuthCallback = request.nextUrl.pathname.startsWith("/auth");

  if (!user && !isAuthPage && !isAuthCallback) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  // If authenticated and trying to access login page, redirect to home
  if (user && isAuthPage) {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    /*
     * Match all request paths EXCEPT:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico, icon.svg (browser icons)
     * - public assets (svg, png, jpg, etc.)
     * - manifest.webmanifest
     * - sw.js (service worker)
     */
    "/((?!_next/static|_next/image|favicon\\.ico|icon\\.svg|manifest\\.webmanifest|sw\\.js|icons/|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
