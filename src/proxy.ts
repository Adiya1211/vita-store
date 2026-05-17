import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  try {
    const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });

    if (pathname === "/login") {
      if (token) return NextResponse.redirect(new URL("/products", request.url));
      return NextResponse.next();
    }

    if (!token) {
      return NextResponse.redirect(new URL("/login", request.url));
    }

    return NextResponse.next();
  } catch {
    // Алдаа гарвал login руу redirect хийнэ
    if (pathname === "/login") return NextResponse.next();
    return NextResponse.redirect(new URL("/login", request.url));
  }
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
