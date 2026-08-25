import { Metadata } from "next";
import "./globals.css";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

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
            
			<body className="flex min-h-dvh flex-col ">
                <Navbar/>
                <main className="flex flex-1">
                    {children}
                </main>
                <Footer/>
            </body>
		</html>
	);
}
