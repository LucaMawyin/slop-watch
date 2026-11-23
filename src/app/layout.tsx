import { Metadata } from "next";
import "./globals.css";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { NotificationProvider } from "@/components/NotificationProvider";

const description = "Find the sloppiest upcoming sports games. Slop Watch ranks games based on how bad the matchup looks.";
const siteUrl = "https://slopwatchsports.com"

export const metadata : Metadata = {
    title : "Slop Watch",
    applicationName: "Slop Watch Sports",
    category: "sports",
    description: description,
    icons: {
        icon: [
            {
                url: "/favicon.svg",
                type: "image/svg+xml",
            },
        ],
    },
    creator: "Luca Mawyin",
    publisher: "Luca Mawyin",
    robots: {
        index: true,
        follow: true,
        googleBot: {
            index: true,
            follow: true,
            "max-image-preview": "large",
        },
    },
    alternates:{
        canonical: "/",
    },
    openGraph: {
        type: "website",
        title: "Slop Watch Sports",
        description,
        siteName: "Slop Watch Sports",
        images: [
            {
                url: "/og-image.png",
                width:800,
                height:800,
                alt: "Slop Watch Sports",
            },
        ],
    },
    twitter: {
        card: "summary_large_image",
        title: "Slop Watch Sports",
        description,
        images: ["/og-image.png"],
    }
}

export default function RootLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
    const websiteJsonLd = {
        "@context": "https://schema.org",
        "@type": "WebSite",
        "@id": `${siteUrl}/#website`,
        name: "Slop Watch Sports",
        alternateName: "Slop Watch",
        url: siteUrl,
        description,
        publisher: {
            "@id": `${siteUrl}/#organization`,
        },
    };

    const organizationJsonLd = {
        "@context": "https://schema.org",
        "@type": "Organization",
        "@id": `${siteUrl}/#organization`,
        name: "Slop Watch Sports",
        alternateName: "Slop Watch",
        url: siteUrl,
        description,
        logo: `${siteUrl}/og-image.png`,
    };

	return (
		<html lang="en">
            
			<body className="flex min-h-dvh flex-col ">

                {[websiteJsonLd, organizationJsonLd].map((schema, index) => (
                    <script
                        key={index}
                        type="application/ld+json"
                        dangerouslySetInnerHTML={{
                            __html: JSON.stringify(schema),
                        }}
                    />
                ))}

                <NotificationProvider>
                    <Navbar/>
                    <main className="flex flex-1">
                        {children}
                    </main>
                    <Footer/>                    
                </NotificationProvider>

            </body>
		</html>
	);
}
