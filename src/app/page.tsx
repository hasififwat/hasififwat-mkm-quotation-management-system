import { LoginForm } from "~/features/authentication/components/LoginForm";
import { ThemeToggle } from "~/features/theme/components/ThemeToggle";

export default function Login() {
	return (
		<div className="relative flex min-h-svh w-full items-center justify-center bg-background bg-radial-[at_50%_0%] from-primary/15 via-muted/65 to-background to-80% px-4 py-20 sm:px-8">
			<div className="absolute top-4 right-4 rounded-xl border bg-card shadow-xs sm:top-6 sm:right-6 [&>button]:size-11 [&>button]:rounded-xl">
				<ThemeToggle />
			</div>
			<div className="w-full max-w-md">
				<LoginForm />
			</div>
		</div>
	);
}
