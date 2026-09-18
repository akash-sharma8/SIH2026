import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";

type AppRole = "STATION_STAFF" | "CONTROL_ROOM";

type DemoUser = {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  role: AppRole;
  stationCode?: string;
};

function getDemoUsers(): DemoUser[] {
  return [
    {
      id: "station-staff-1",
      name: "Station Staff",
      email: process.env.STATION_STAFF_EMAIL ?? "",
      passwordHash:
        process.env.STATION_STAFF_PASSWORD_HASH ?? "",
      role: "STATION_STAFF",
      stationCode:
        process.env.STATION_STAFF_CODE ?? "",
    },
    {
      id: "control-room-1",
      name: "Control Room",
      email: process.env.CONTROL_ROOM_EMAIL ?? "",
      passwordHash:
        process.env.CONTROL_ROOM_PASSWORD_HASH ?? "",
      role: "CONTROL_ROOM",
    },
  ];
}

export const {
  handlers,
  auth,
  signIn,
  signOut,
} = NextAuth({
  session: {
    strategy: "jwt",
  },

  providers: [
    Credentials({
      credentials: {
        email: {},
        password: {},
      },

      async authorize(credentials) {
        const email = String(
          credentials?.email ?? ""
        )
          .trim()
          .toLowerCase();

        const password = String(
          credentials?.password ?? ""
        );

        if (!email || !password) {
          return null;
        }

        const user = getDemoUsers().find(
          (item) =>
            item.email.toLowerCase() === email
        );

        if (!user || !user.passwordHash) {
          return null;
        }

        const valid = await bcrypt.compare(
          password,
          user.passwordHash
        );

        if (!valid) {
          return null;
        }

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          stationCode: user.stationCode,
        };
      },
    }),
  ],

  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = user.role;
        token.stationCode =
          user.stationCode;
      }

      return token;
    },

    async session({ session, token }) {
      if (session.user) {
        session.user.role =
          token.role as AppRole;

        session.user.stationCode =
          token.stationCode as
            | string
            | undefined;
      }

      return session;
    },
  },
});