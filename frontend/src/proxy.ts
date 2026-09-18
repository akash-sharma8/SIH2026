import { auth } from "../auth";
import { NextResponse } from "next/server";

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const user = req.auth?.user;

  const isStationRoute =
    pathname.startsWith("/station-display");

  const isControlRoute =
    pathname.startsWith("/control-room");

  if (!isStationRoute && !isControlRoute) {
    return NextResponse.next();
  }

  if (!user) {
    const loginUrl = new URL(
      "/login",
      req.nextUrl.origin
    );

    return NextResponse.redirect(
      loginUrl
    );
  }

  if (
    isStationRoute &&
    user.role !== "STATION_STAFF"
  ) {
    return NextResponse.redirect(
      new URL(
        "/control-room",
        req.nextUrl.origin
      )
    );
  }

  if (
    isControlRoute &&
    user.role !== "CONTROL_ROOM"
  ) {
    return NextResponse.redirect(
      new URL(
        "/station-display",
        req.nextUrl.origin
      )
    );
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    "/station-display/:path*",
    "/control-room/:path*",
  ],
};