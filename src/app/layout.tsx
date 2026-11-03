import { Inter } from "next/font/google";
import type { Metadata } from "next";
import "./globals.css";

import { Providers } from "./providers";

// Self-hosted via next/font — no external Google Fonts requests,
// no layout shift, preloaded automatically (server-hoist-static-io).
const inter = Inter({
	subsets: ["latin"],
	variable: "--font-inter",
	display: "swap",
});

export const metadata: Metadata = {
	title: {
		default: "MKM Quotation",
		template: "%s - MKM Quotation",
	},
	description: "Umrah package & quotation management system",
};

export default function RootLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	return (
		<html lang="en" className={inter.variable} suppressHydrationWarning>
			<body>
				<Providers>{children}</Providers>
			</body>
		</html>
	);
}
