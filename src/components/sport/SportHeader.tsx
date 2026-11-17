
type SportHeaderProps = {
    name: string;
    description?: string;
    image?: string;
};

export default function SportHeader({
    name,
    description,
    image,
}: SportHeaderProps) {
    return (
        <section
            className="
                relative
                overflow-hidden
                rounded-2xl
                border
                border-zinc-800
                bg-zinc-900
            "
        >
            {image && (
                <div
                    className="
                        absolute
                        inset-0
                        bg-cover
                        bg-center
                        opacity-30
                    "
                    style={{
                        backgroundImage: `url(${image})`,
                    }}
                />
            )}

            <div className="
                absolute
                inset-0
                bg-linear-to-r
                from-zinc-950
                via-zinc-950/80
                to-transparent
            " />

            <div className="
                relative
                z-10
                flex
                min-h-48
                flex-col
                justify-end
                p-6
                sm:min-h-64
                sm:p-10
            ">

                <h1 className="
                    text-4xl
                    font-bold
                    tracking-tight
                    sm:text-5xl
                ">
                    {name}
                </h1>

                {description && (
                    <p className="
                        mt-3
                        max-w-xl
                        text-sm
                        text-zinc-400
                        sm:text-base
                    ">
                        {description}
                    </p>
                )}
            </div>
        </section>
    );
}
