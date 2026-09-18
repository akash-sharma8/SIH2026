import { DefaultSession } from "next-auth";

type AppRole =
  | "STATION_STAFF"
  | "CONTROL_ROOM";

declare module "next-auth" {
  interface Session {
    user: {
      role: AppRole;
      stationCode?: string;
    } & DefaultSession["user"];
  }

  interface User {
    role: AppRole;
    stationCode?: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role?: AppRole;
    stationCode?: string;
  }
}