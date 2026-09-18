"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";

type AppNavbarProps = {
    role?:
    | "Passenger"
    | "Station board"
    | "Control room"
    | "Model intelligence";

    refreshSeconds?: number | null;
};

export default function AppNavbar({
    role = "Passenger",
    refreshSeconds = null,
}: AppNavbarProps) {

    const pathname = usePathname();

    const [sessionUser, setSessionUser] = useState<{
        role?: "STATION_STAFF" | "CONTROL_ROOM";
        stationCode?: string;
        name?: string | null;
    } | null>(null);

    const [sessionLoaded, setSessionLoaded] =
        useState(false);

    useEffect(() => {
        let cancelled = false;

        async function loadSession() {
            try {
                const response = await fetch(
                    "/api/auth/session",
                    {
                        cache: "no-store",
                    },
                );

                const session =
                    await response.json();

                if (!cancelled) {
                    setSessionUser(
                        session?.user ?? null,
                    );
                }
            } catch {
                if (!cancelled) {
                    setSessionUser(null);
                }
            } finally {
                if (!cancelled) {
                    setSessionLoaded(true);
                }
            }
        }

        loadSession();

        return () => {
            cancelled = true;
        };
    }, [pathname]);

    const displayRole =
        sessionUser?.role === "STATION_STAFF"
            ? sessionUser.stationCode
                ? `Station Staff • ${sessionUser.stationCode}`
                : "Station Staff"
            : sessionUser?.role === "CONTROL_ROOM"
                ? "Control Room"
                : role;

    const [
        roleMenuOpen,
        setRoleMenuOpen,
    ] = useState(false);

    const [
        mobileMenuOpen,
        setMobileMenuOpen,
    ] = useState(false);

    function navClass(path: string) {
        const active =
            pathname === path;

        return [
            "flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium transition",
            active
                ? "bg-slate-700 text-white"
                : "text-slate-400 hover:bg-slate-800 hover:text-white",
        ].join(" ");
    }

    const roleMenuRef =
        useRef<HTMLDivElement | null>(null);

    const mobileMenuButtonRef =
        useRef<HTMLButtonElement | null>(null);

    const mobileMenuPanelRef =
        useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        function handlePointerDown(
            event: MouseEvent,
        ) {
            const target =
                event.target as Node;

            if (
                roleMenuRef.current
                && !roleMenuRef.current.contains(
                    target,
                )
            ) {
                setRoleMenuOpen(false);
            }

            const clickedMobileButton =
                mobileMenuButtonRef.current
                    ?.contains(target)
                ?? false;

            const clickedMobilePanel =
                mobileMenuPanelRef.current
                    ?.contains(target)
                ?? false;

            if (
                !clickedMobileButton
                && !clickedMobilePanel
            ) {
                setMobileMenuOpen(false);
            }
        }

        function handleKeyDown(
            event: KeyboardEvent,
        ) {
            if (event.key === "Escape") {
                setRoleMenuOpen(false);
                setMobileMenuOpen(false);
            }
        }

        document.addEventListener(
            "mousedown",
            handlePointerDown,
        );

        document.addEventListener(
            "keydown",
            handleKeyDown,
        );

        return () => {
            document.removeEventListener(
                "mousedown",
                handlePointerDown,
            );

            document.removeEventListener(
                "keydown",
                handleKeyDown,
            );
        };
    }, []);

    return (
        <header className="sticky top-0 z-[1000] border-b border-slate-800 bg-[#111c2c]">
            <div className="mx-auto flex h-[52px] max-w-7xl items-center justify-between px-4 sm:px-6">

                {/* Brand */}
                <div className="flex min-w-0 items-center gap-6">
                    <Link
                        href="/"
                        className="flex shrink-0 items-center gap-2.5"
                    >
                        <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-700 text-white">
                            <svg
                                viewBox="0 0 24 24"
                                className="h-4 w-4"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="1.8"
                            >
                                <rect
                                    x="6"
                                    y="3"
                                    width="12"
                                    height="14"
                                    rx="4"
                                />
                                <path d="M8.5 7h7" />
                                <path d="M9 20l3-3 3 3" />
                            </svg>
                        </div>

                        <div className="leading-tight">
                            <p className="text-sm font-bold text-white">
                                RailETA
                            </p>

                            <p className="hidden text-[9px] tracking-wide text-slate-400 sm:block">
                                Dynamic ETA Intelligence
                            </p>
                        </div>
                    </Link>

                    {/* Main navigation */}
                    <nav className="hidden items-center gap-1 md:flex">
                        <Link
                            href="/"
                            className={navClass("/")}
                        >
                            <svg
                                viewBox="0 0 24 24"
                                className="h-4 w-4"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="1.8"
                            >
                                <path d="M6 17h12" />
                                <path d="M8 17l-2 4" />
                                <path d="M16 17l2 4" />
                                <rect x="5" y="3" width="14" height="14" rx="4" />
                                <path d="M8 7h8" />
                                <circle cx="9" cy="13" r="1" />
                                <circle cx="15" cy="13" r="1" />
                            </svg>

                            Live train
                        </Link>

                        <Link
                            href="/model-intelligence"
                            className={navClass(
                                "/model-intelligence",
                            )}
                        >
                            <svg
                                viewBox="0 0 24 24"
                                className="h-4 w-4"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="1.8"
                            >
                                <circle cx="12" cy="12" r="3" />
                                <path d="M12 2v4" />
                                <path d="M12 18v4" />
                                <path d="M2 12h4" />
                                <path d="M18 12h4" />
                                <path d="M4.9 4.9l2.8 2.8" />
                                <path d="M16.3 16.3l2.8 2.8" />
                                <path d="M19.1 4.9l-2.8 2.8" />
                                <path d="M7.7 16.3l-2.8 2.8" />
                            </svg>

                            Model intelligence
                        </Link>

                        <Link
                            href="/station-display"
                            className={navClass(
                                "/station-display",
                            )}
                        >
                            <svg
                                viewBox="0 0 24 24"
                                className="h-4 w-4"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="1.8"
                            >
                                <rect x="4" y="4" width="16" height="16" rx="2" />
                                <path d="M8 8h8" />
                                <path d="M8 12h5" />
                                <path d="M8 16h3" />
                            </svg>

                            Station board
                        </Link>

                        <Link
                            href="/control-room"
                            className={navClass(
                                "/control-room",
                            )}
                        >
                            <svg
                                viewBox="0 0 24 24"
                                className="h-4 w-4"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="1.8"
                            >
                                <path d="M4 19V9" />
                                <path d="M10 19V5" />
                                <path d="M16 19v-7" />
                                <path d="M22 19V3" />
                            </svg>

                            Operations
                        </Link>
                    </nav>
                </div>

                {/* Right status */}
                <div className="flex items-center gap-2">
                    <button
                        ref={mobileMenuButtonRef}
                        type="button"
                        onClick={() =>
                            setMobileMenuOpen(
                                (open) => !open,
                            )
                        }
                        className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-700 text-slate-300 transition hover:bg-slate-800 md:hidden"
                        aria-label="Toggle navigation"
                    >
                        <svg
                            viewBox="0 0 24 24"
                            className="h-4 w-4"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                        >
                            {mobileMenuOpen ? (
                                <>
                                    <path d="M6 6l12 12" />
                                    <path d="M18 6L6 18" />
                                </>
                            ) : (
                                <>
                                    <path d="M4 7h16" />
                                    <path d="M4 12h16" />
                                    <path d="M4 17h16" />
                                </>
                            )}
                        </svg>
                    </button>
                    <div className="hidden items-center gap-2 rounded-full border border-slate-700 px-3 py-1.5 text-xs text-slate-400 sm:flex">
                        <span className="h-2 w-2 rounded-full bg-sky-500" />

                        <span className="font-semibold text-white">
                            LIVE
                        </span>

                        {refreshSeconds != null && (
                            <>
                                <span className="text-slate-600">
                                    •
                                </span>

                                <span>
                                    Auto refresh in{" "}
                                    <strong className="font-semibold text-slate-200">
                                        {refreshSeconds}s
                                    </strong>
                                </span>
                            </>
                        )}
                    </div>

                    <div
                        ref={roleMenuRef}
                        className="relative"
                    >
                        <button
                            type="button"
                            onClick={() =>
                                setRoleMenuOpen(
                                    (open) => !open,
                                )
                            }
                            className="flex items-center gap-2 rounded-full border border-slate-700 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-slate-800"
                        >
                            <svg
                                viewBox="0 0 24 24"
                                className="h-4 w-4 text-slate-400"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="1.8"
                            >
                                <circle
                                    cx="12"
                                    cy="8"
                                    r="3"
                                />
                                <path d="M6 20c.5-4 2.5-6 6-6s5.5 2 6 6" />
                            </svg>

                            {sessionLoaded
                                ? displayRole
                                : role}

                            <svg
                                viewBox="0 0 24 24"
                                className={[
                                    "h-3.5 w-3.5 text-slate-400 transition-transform",
                                    roleMenuOpen
                                        ? "rotate-180"
                                        : "",
                                ].join(" ")}
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                            >
                                <path d="m6 9 6 6 6-6" />
                            </svg>
                        </button>

                        {roleMenuOpen && (
                            <div className="absolute right-0 top-full z-[1100] mt-2 w-56 overflow-hidden rounded-xl border border-slate-700 bg-[#172235] p-2 shadow-xl">

                                {sessionUser ? (
                                    <>
                                        <div className="border-b border-slate-700 px-3 pb-3 pt-1">
                                            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                                                Signed in as
                                            </p>

                                            <p className="mt-1 text-sm font-medium text-white">
                                                {displayRole}
                                            </p>

                                            {sessionUser.role ===
                                                "STATION_STAFF" &&
                                                sessionUser.stationCode && (
                                                    <p className="mt-0.5 text-xs text-slate-400">
                                                        Station{" "}
                                                        {sessionUser.stationCode}
                                                    </p>
                                                )}
                                        </div>

                                        <Link
                                            href={
                                                sessionUser.role ===
                                                    "STATION_STAFF"
                                                    ? "/station-display"
                                                    : "/control-room"
                                            }
                                            onClick={() =>
                                                setRoleMenuOpen(false)
                                            }
                                            className="mt-2 flex items-center rounded-lg px-3 py-2 text-sm text-slate-200 transition hover:bg-slate-700"
                                        >
                                            Open dashboard
                                        </Link>

                                        <button
                                            type="button"
                                            onClick={async () => {
                                                setRoleMenuOpen(false);

                                                await signOut({
                                                    callbackUrl: "/",
                                                });
                                            }}
                                            className="flex w-full items-center rounded-lg px-3 py-2 text-left text-sm text-red-300 transition hover:bg-red-500/10"
                                        >
                                            Sign out
                                        </button>
                                    </>
                                ) : (
                                    <>
                                        <p className="px-3 pb-2 pt-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                                            Access
                                        </p>

                                        <Link
                                            href="/"
                                            onClick={() =>
                                                setRoleMenuOpen(false)
                                            }
                                            className="flex items-center justify-between rounded-lg px-3 py-2 text-sm text-slate-200 transition hover:bg-slate-700"
                                        >
                                            Passenger

                                            {role === "Passenger" && (
                                                <span className="text-sky-400">
                                                    ✓
                                                </span>
                                            )}
                                        </Link>

                                        <Link
                                            href="/login"
                                            onClick={() =>
                                                setRoleMenuOpen(false)
                                            }
                                            className="mt-1 flex items-center rounded-lg px-3 py-2 text-sm font-medium text-sky-300 transition hover:bg-slate-700"
                                        >
                                            Staff login
                                        </Link>
                                    </>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>
            {mobileMenuOpen && (
                <div
                    ref={mobileMenuPanelRef}
                    className="border-t border-slate-800 bg-[#111c2c] px-4 py-3 md:hidden"
                >
                    <nav className="mx-auto flex max-w-7xl flex-col gap-1">
                        <Link
                            href="/"
                            onClick={() =>
                                setMobileMenuOpen(false)
                            }
                            className={navClass("/")}
                        >
                            Live train
                        </Link>

                        <Link
                            href="/model-intelligence"
                            onClick={() =>
                                setMobileMenuOpen(false)
                            }
                            className={navClass(
                                "/model-intelligence",
                            )}
                        >
                            Model intelligence
                        </Link>

                        <Link
                            href="/station-display"
                            onClick={() =>
                                setMobileMenuOpen(false)
                            }
                            className={navClass(
                                "/station-display",
                            )}
                        >
                            Station board
                        </Link>

                        <Link
                            href="/control-room"
                            onClick={() =>
                                setMobileMenuOpen(false)
                            }
                            className={navClass(
                                "/control-room",
                            )}
                        >
                            Operations
                        </Link>
                    </nav>
                </div>
            )}
        </header>
    );
}