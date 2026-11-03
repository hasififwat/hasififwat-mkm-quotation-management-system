import Link from "next/link";

export default function NotFound() {
	return (
		<main className="pt-16 p-4 container mx-auto">
			<h1>404</h1>
			<p>The requested page could not be found.</p>
			<Link href="/" className="text-primary underline">
				Go back home
			</Link>
		</main>
	);
}
