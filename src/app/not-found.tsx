import Link from "next/link";

export default function NotFound() {
	return (
		<main className="flex min-h-svh items-center justify-center bg-background bg-radial-[at_50%_0%] from-primary/15 via-muted/65 to-background to-80% px-4 py-12 sm:px-8">
			<div className="w-full max-w-md rounded-3xl border bg-card px-6 py-10 text-center text-card-foreground shadow-xl shadow-foreground/8 sm:px-10 sm:py-12 dark:shadow-black/25">
				<h1 className="text-6xl leading-none font-semibold tracking-tight text-primary sm:text-7xl">
					404
				</h1>
				<p className="mt-4 text-base text-muted-foreground">
					The requested page could not be found.
				</p>
				<Link
					href="/"
					className="mt-7 inline-flex min-h-11 items-center justify-center rounded-lg bg-primary px-5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
				>
					Go back home
				</Link>
			</div>
		</main>
	);
}
