import { LoginForm } from "~/features/authentication/components/LoginForm";
import { QuotationDemo } from "~/features/authentication/components/QuotationDemo";
import { ThemeToggle } from "~/features/theme/components/ThemeToggle";
import styles from "./login.module.css";

export default function Login() {
	return (
		<main className={styles.page}>
			<header className={styles.header}>
				<div className="flex items-center gap-2.5 text-sm font-semibold tracking-tight">
					<span className="text-base font-extrabold tracking-[-0.075em]">MKM</span>
					<span className="border-l border-input pl-2.5">Quotation</span>
				</div>
				<ThemeToggle />
			</header>

			<div className={styles.intro}>
				<p className={styles.headline}>
					Umrah packages, <span>ready to quote.</span>
				</p>
				<p className={styles.explanation}>
					See how a package becomes a quotation for your client.
				</p>
			</div>

			<div className={styles.form}>
				<LoginForm />
			</div>

			<div className={styles.preview}>
				<QuotationDemo />
			</div>
		</main>
	);
}
