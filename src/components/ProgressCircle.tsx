import { useEffect, useState } from "react";

export default function ProgressCircle(props: {progress : number, progressColour: string}){

    const circumference = 2 * Math.PI * 42;
    const [offset, setOffset] = useState(circumference);

    useEffect(() => {
        requestAnimationFrame(() => {
            setOffset(circumference * (1 - props.progress));
        });
    }, [props.progress, circumference]);

    return (
        <svg
            className="h-full w-full -rotate-90"
            viewBox="0 0 100 100"
        >
            {/* Background circle */}
            <circle
                cx="50"
                cy="50"
                r="42"
                fill="none"
                stroke="currentColor"
                strokeWidth="8"
                className="text-zinc-800"
            />

            {/* Progress circle */}
            <circle
                cx="50"
                cy="50"
                r="42"
                fill="none"
                stroke={props.progressColour}
                strokeWidth="8"
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={offset}
                className="text-white transition-[stroke-dashoffset] duration-1000 ease-out"
            />
        </svg>
    );
}
                                            
