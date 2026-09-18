import { auth } from "../../../../../auth";
import { NextResponse } from "next/server";

export async function GET() {
    const session = await auth();

    if (!session?.user?.role) {
        return NextResponse.json(
            {
                success: false,
                error: "Unauthorized",
            },
            {
                status: 401,
            },
        );
    }

    const backendUrl =
        process.env.BACKEND_API_URL;

    const staffSecret =
        process.env.STAFF_API_SECRET;

    if (!backendUrl || !staffSecret) {
        return NextResponse.json(
            {
                success: false,
                error:
                    "Staff backend integration is not configured.",
            },
            {
                status: 503,
            },
        );
    }

    const headers: Record<string, string> = {
        "X-Staff-API-Secret":
            staffSecret,
        "X-Staff-Role":
            session.user.role,
    };

    if (session.user.stationCode) {
        headers["X-Station-Code"] =
            session.user.stationCode;
    }

    const response =
        await fetch(
            `${backendUrl}/staff/me`,
            {
                method: "GET",
                headers,
                cache: "no-store",
            },
        );

    const data =
        await response.json();

    return NextResponse.json(
        data,
        {
            status:
                response.status,
        },
    );
}