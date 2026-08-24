export default function Badge(props: {
    title:string;
    x:number;
    y:number;
    borderColour?:string;
    bgColour?:string;
    textColour?:string;
    className?:string;
}){
    return (
        <div
            style={{
                paddingLeft: `${props.x * 0.25}rem`,
                paddingRight: `${props.x * 0.25}rem`,
                paddingTop: `${props.y * 0.25}rem`,
                paddingBottom: `${props.y * 0.25}rem`,
            }}
            className={`
                inline-flex
                rounded-full
                border
                text-xs
                font-medium
                h-fit
                ${props.borderColour ?? "border-zinc-700"}
                ${props.bgColour ?? "bg-zinc-800"}
                ${props.textColour ?? "text-zinc-200"}
                ${props.className}
            `}
        >
            {props.title}
        </div>
    );
}