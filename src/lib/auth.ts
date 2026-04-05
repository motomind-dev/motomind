import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { compare } from "bcryptjs";
import { prisma } from "./prisma";
import { onLoginSuccess, onLoginFailed } from "./security/detect-suspicious-activity";
import { getAppBaseUrl } from "./app-url";

if (process.env.NEXTAUTH_URL) {
  process.env.NEXTAUTH_URL = getAppBaseUrl();
}

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Mot de passe", type: "password" },
      },
      async authorize(credentials, req) {
        if (!credentials?.email || !credentials?.password) return null;

        try {
          const user = await prisma.user.findUnique({
            where: { email: credentials.email },
          });

          if (!user || !user.password) {
            if (req?.headers && credentials.email) {
              onLoginFailed(credentials.email, req as Request).catch((err) =>
                console.error("[Security] onLoginFailed:", err)
              );
            }
            return null;
          }

          const isValid = await compare(credentials.password, user.password);
          if (!isValid) {
            if (req?.headers) {
              onLoginFailed(credentials.email, req as Request).catch((err) =>
                console.error("[Security] onLoginFailed:", err)
              );
            }
            return null;
          }

          if (!user.emailVerified && process.env.RESEND_API_KEY) {
            throw new Error("EMAIL_NOT_VERIFIED");
          }

          if (req?.headers) {
            onLoginSuccess(user.id, user.email, req as Request).catch((err) =>
              console.error("[Security] onLoginSuccess:", err)
            );
          }

          return {
            id: user.id,
            email: user.email,
            name: user.name,
            image: user.image,
          };
        } catch (e) {
          if (e instanceof Error && e.message === "EMAIL_NOT_VERIFIED") {
            throw e;
          }
          console.error("[auth] authorize DB error:", e);
          return null;
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) token.id = user.id;
      return token;
    },
    async session({ session, token }) {
      if (session?.user) session.user.id = token.id as string;
      return session;
    },
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  /**
   * maxAge : durée max du JWT chiffré (renouvelé côté serveur tant que le cookie existe).
   * Cookie de session : patch `patches/next-auth+4.24.13.patch` — pas de Max-Age/Expires sur le
   * cookie `session-token`, donc il est supprimé à la fermeture du navigateur (onglets seuls :
   * le cookie reste souvent actif tant que le navigateur est ouvert — comportement standard des
   * navigateurs).
   */
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // plafond JWT ; la déconnexion « fermeture app » = fin du cookie
  },
  secret: process.env.NEXTAUTH_SECRET,
};
