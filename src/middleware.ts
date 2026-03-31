import { withAuth } from "next-auth/middleware";

export default withAuth({
  pages: { signIn: "/login" },
});

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/motorcycles/:path*",
    "/maintenance/:path*",
    "/history/:path*",
    "/trash/:path*",
    "/security/:path*",
    "/motos/:path*",
    "/entretiens/:path*",
  ],
};
