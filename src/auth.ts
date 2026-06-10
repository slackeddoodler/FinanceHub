import NextAuth, { type DefaultSession } from "next-auth";
import MicrosoftEntraID from "next-auth/providers/microsoft-entra-id";

// 1. FUTURE-PROOFING: Extending types so the app compiles cleanly, 
// allowing an easy transition to roles later without breaking changes.
declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: "admin" | "user"; 
    } & DefaultSession["user"];
  }
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  basePath: "/api/auth",

  providers: [
    MicrosoftEntraID({
      clientId: process.env.AZURE_AD_CLIENT_ID,
      clientSecret: process.env.AZURE_AD_CLIENT_SECRET,
      issuer: `https://login.microsoftonline.com/${process.env.AZURE_AD_TENANT_ID}/v2.0`,
    }),
  ],
  
  // Pure JWT strategy: No user data is written to or read from a database schema.
  // Session validation is performed completely via securely encrypted cookies.
  session: {
    strategy: "jwt", 
  },
  
  callbacks: {
    // Authenticate any verified user inside your Microsoft directory
    async signIn({ user }) {
      return true; 
    },

    // Quietly append properties to the session token for future extensibility
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.email === process.env.ADMIN_EMAIL ? "admin" : "user";
      }
      return token;
    },

    // Expose the profile data cleanly to the front-end hooks
    async session({ session, token }) {
      if (session.user && token.sub) {
        session.user.id = token.sub;
        session.user.role = (token.role as "admin" | "user") || "user";
      }
      return session;
    },
  },
});