import { Metadata } from "next";
import "./globals.css";

const description = "Find the sloppiest upcoming sports games. Slop Watch ranks games based on how bad the matchup looks.";

export const metadata : Metadata = {
    title : "Slop Watch",
    description: description,
    icons: {
        icon: [
            {
                url: "/favicon.svg",
                type: "image/svg+xml",
            },
        ],
    },
}

export default function RootLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	return (
		<html lang="en">
			<body>{children}</body>
		</html>
	);
}
