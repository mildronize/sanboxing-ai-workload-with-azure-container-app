import { betterAuth } from "better-auth";
import { APIError } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { prisma } from "./prisma";

const maxUsers = Number(process.env["MAX_USERS"] ?? "30");

export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false,
  },
  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days
    updateAge: 60 * 60 * 24, // 1 day
  },
  secret: process.env.BETTER_AUTH_SECRET ?? "dev-secret-change-in-production",
  baseURL: process.env.BETTER_AUTH_URL ?? "http://localhost:3001",
  databaseHooks: {
    user: {
      create: {
        before: async () => {
          const count = await prisma.user.count();
          if (count >= maxUsers) {
            throw new APIError("FORBIDDEN", {
              message: "Registration is closed. Maximum number of users reached.",
            });
          }
        },
      },
    },
  },
});

export type Auth = typeof auth;
