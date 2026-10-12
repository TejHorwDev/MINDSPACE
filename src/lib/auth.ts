import type { NextAuthOptions } from "next-auth";
import { getServerSession } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import { compare } from "bcryptjs";
import { db } from "@/lib/db";

const googleEnabled =
  !!process.env.GOOGLE_CLIENT_ID && !!process.env.GOOGLE_CLIENT_SECRET;

export const authOptions: NextAuthOptions = {
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  providers: [
    CredentialsProvider({
      name: "Email and Password",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Please enter your email and password.");
        }

        const email = credentials.email.trim().toLowerCase();
        const user = await db.user.findUnique({ where: { email } });

        // Deliberately generic message: never reveal whether the email exists.
        if (!user || !user.passwordHash) {
          throw new Error("Invalid email or password.");
        }

        const passwordMatches = await compare(
          credentials.password,
          user.passwordHash
        );
        if (!passwordMatches) {
          throw new Error("Invalid email or password.");
        }

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
        };
      },
    }),
    ...(googleEnabled
      ? [
          GoogleProvider({
            clientId: process.env.GOOGLE_CLIENT_ID!,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
          }),
        ]
      : []),
  ],
  callbacks: {
    async jwt({ token, user, account }) {
      // Credentials sign-in: user.id and role come straight from authorize
      if (user?.id) {
        token.id = user.id;
        token.role = user.role;
      }

      // Google sign-in: ensure OAuth user has a database row
      if (account?.provider === "google" && user?.email && !user.id) {
        const dbUser = await db.user.upsert({
          where: { email: user.email },
          update: { name: user.name ?? undefined },
          create: { email: user.email, name: user.name ?? null },
        });
        token.id = dbUser.id;
        token.role = dbUser.role;
      }

      // Always populate role if missing in active token
      if (token.id && !token.role) {
        const dbUser = await db.user.findUnique({
          where: { id: token.id as string },
          select: { role: true },
        });
        if (dbUser) {
          token.role = dbUser.role;
        }
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user && token.id) {
        session.user.id = token.id as string;
        session.user.role = (token.role as string) || "student";
      }
      return session;
    },
  },
};

/**
 * Returns the current session (with user.id) or null.
 * Safe to call from server components and route handlers.
 */
export function getAuthSession() {
  return getServerSession(authOptions);
}

/**
 * Returns the current authenticated user object or null.
 */
export async function getCurrentUser() {
  const session = await getAuthSession();
  return session?.user || null;
}

