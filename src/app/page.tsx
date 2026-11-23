import { FileText, Home } from "lucide-react";
import Image from "next/image";
import { LoginForm } from "~/features/authentication/components/LoginForm";
import { ThemeToggle } from "~/features/theme/components/ThemeToggle";
import styles from "./login.module.css";

export default function Login() {
	return (
		<main className={styles.page}>
			<header className={styles.header}>
				<div className="flex items-center gap-3 font-semibold tracking-tight">
					<span className="grid size-9 shrink-0 place-items-center rounded-lg bg-primary text-primary-foreground">
						<Home aria-hidden="true" className="size-[18px]" />
					</span>
					MKM Quotation
				</div>
				<ThemeToggle />
			</header>

			<div className={styles.intro}>
				<p className={styles.headline}>
					Umrah quotations, <span>in one place.</span>
				</p>
				<p className="mt-4 max-w-md text-base leading-relaxed text-muted-foreground lg:mt-5 lg:text-lg">
					Manage Umrah packages and prepare quotations for your clients.
				</p>
			</div>

			<div className={styles.form}>
				<LoginForm />
			</div>

			<section
				aria-labelledby="sample-quotation"
				className={`${styles.preview} overflow-hidden rounded-2xl border bg-card shadow-lg shadow-foreground/5`}
			>
				<h2
					id="sample-quotation"
					className="flex items-center gap-2.5 px-5 py-3.5 text-sm font-semibold sm:px-6"
				>
					<FileText aria-hidden="true" className="size-4 text-primary" />
					Sample quotation
				</h2>
				<Image
					src="/login-madinah.webp"
					alt=""
					width={1440}
					height={629}
					sizes="(min-width: 640px) 592px, 100vw"
					className="aspect-[5/2] w-full object-cover"
				/>
				<div className="px-5 py-5 sm:px-6">
					<h3 className="text-lg font-semibold tracking-tight">12-day Umrah package</h3>
					<p className="mt-1 text-sm text-muted-foreground">Madinah &amp; Makkah</p>
					<dl className="mt-4 flex flex-wrap justify-between gap-x-6 gap-y-3 border-t pt-4">
						<div>
							<dt className="text-xs text-muted-foreground">Travellers</dt>
							<dd className="mt-1 text-sm font-medium">2 adults</dd>
						</div>
						<div>
							<dt className="text-xs text-muted-foreground">Estimated total</dt>
							<dd className="mt-1 text-sm font-semibold tabular-nums">RM 15,800</dd>
						</div>
					</dl>
				</div>
			</section>
		</main>
	);
}
