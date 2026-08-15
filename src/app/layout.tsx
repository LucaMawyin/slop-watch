import { Metadata } from "next";
import "./globals.css";
import Navbar from "@/components/Navbar";

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
            
			<body className="flex min-h-screen flex-col">
                <Navbar/>
                {children}
            </body>
		</html>
	);
}
