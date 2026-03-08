import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
    const currentPath = request.nextUrl.pathname;

    // Basic mock check. In proper production, we would decode a JWT from cookies here.
    const isAuth = request.cookies.has("auth_token");
    const userRole = request.cookies.get("user_role")?.value;

    // Protect Admin Routes
    if (currentPath.startsWith("/admin")) {
        if (!isAuth) {
            return NextResponse.redirect(new URL("/login", request.url));
        }
        if (userRole !== "admin") {
            return NextResponse.redirect(new URL("/client/dashboard", request.url));
        }
    }

    // Protect Client Routes
    if (currentPath.startsWith("/client")) {
        if (!isAuth) {
            return NextResponse.redirect(new URL("/login", request.url));
        }
        if (userRole !== "client" && userRole !== "admin") {
            return NextResponse.redirect(new URL("/login", request.url));
        }
    }

    // Handle / route redirection based on role
    if (currentPath === "/") {
        if (isAuth) {
            if (userRole === "admin") {
                return NextResponse.redirect(new URL("/admin/dashboard", request.url));
            } else {
                return NextResponse.redirect(new URL("/client/dashboard", request.url));
            }
        } else {
            return NextResponse.redirect(new URL("/login", request.url));
        }
    }

    return NextResponse.next();
}

export const config = {
    matcher: ["/", "/admin/:path*", "/client/:path*"],
};
