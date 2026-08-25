export default function Footer() {
    return (
        <footer className="
            border-t
            border-zinc-800
            relative
            bottom-0
            flex-1
        ">
            <div className="
                flex
                flex-col
                items-center
                justify-between
                gap-4
                px-6
                py-6
                text-sm
                sm:flex-row
            ">
                <p>© {new Date().getFullYear()} Slop Watch by Luca Mawyin</p>

                <div className="flex items-center gap-6">
                    <a
                        href="https://github.com/LucaMawyin/slop-watch"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hover:text-white"
                    >
                        GitHub
                    </a>

                    <a
                        href="https://lucamawyin.com"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hover:text-white"
                    >
                        Luca Mawyin
                    </a>
                </div>
            </div>
        </footer>
    );
}