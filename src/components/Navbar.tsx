import Link from "next/link";
import { leagues } from "@/lib/leagues";

export default function Navbar() {
    return (
        <nav className="border-b border-zinc-800">
            <div className="flex items-center justify-between px-6 py-4">
                <Link
                    href="/"
                    className="text-xl font-bold text-white"
                >
                    Slop Watch
                </Link>

                <div className="flex items-center gap-6">

                    {leagues.map((league) => (
                        <Link
                            key={league.id}
                            href={`/games?league=${league.id}`}
                            className="text-sm text-zinc-300 hover:text-white"
                        >
                            {league.name}
                        </Link>
                    ))}
                </div>
            </div>
        </nav>
    );
}