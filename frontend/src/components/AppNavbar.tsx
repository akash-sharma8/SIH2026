"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type AppNavbarProps = {
    role?:
    | "Passenger"
    | "Station staff"
    | "Control room"
    | "Model intelligence";
};

export default function AppNavbar({
    role = "Passenger",
}: AppNavbarProps) {
    const pathname = usePathname();

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
                    <div className="hidden items-center gap-2 rounded-full border border-slate-700 px-3 py-1.5 text-xs text-slate-400 sm:flex">
                        <span className="h-2 w-2 rounded-full bg-sky-500" />

                        <span className="font-semibold text-white">
                            LIVE
                        </span>
                    </div>

                    <div className="flex items-center gap-2 rounded-full border border-slate-700 px-3 py-1.5 text-xs font-medium text-white">
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

                        {role}
                    </div>
                </div>
            </div>
        </header>
    );
}