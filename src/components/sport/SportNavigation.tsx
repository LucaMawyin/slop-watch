"use client";

const navigation = [
    { label: "Overview", id: "overview" },
    { label: "Games", id: "games" },
    { label: "Teams", id: "teams" },
    { label: "Standings", id: "standings" },
    { label: "Leaders", id: "leaders" },
];

export default function SportNavigation() {
    return (
        <nav className="sticky top-0 z-20 border-b border-zinc-800 bg-zinc-950/90 backdrop-blur">
            <div className="flex gap-6 overflow-x-auto">
                {navigation.map((item) => (
                    <a
                        key={item.id}
                        href={`#${item.id}`}
                        className="shrink-0 py-4 text-sm font-medium text-zinc-400 transition-colors hover:text-white"
                    >
                        {item.label}
                    </a>
                ))}
            </div>
        </nav>
    );
}