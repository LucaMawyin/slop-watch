export default function ShowMoreButton({
    currentCount,
    totalCount,
    onShowMore,
}: {
    currentCount: number;
    totalCount: number;
    onShowMore: () => void;
}) {
    if (currentCount >= totalCount) {
        return null;
    }

    return (
        <button
            type="button"
            onClick={onShowMore}
            className="
                mt-3
                w-full
                rounded-lg
                border
                border-zinc-800
                bg-zinc-900
                py-3
                text-sm
                text-zinc-400
                hover:border-zinc-700
                hover:text-white
            "
        >
            Show More
        </button>
    );
}