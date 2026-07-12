import { LoginForm } from "~/features/authentication /components/LoginForm";
import { ThemeToggle } from "~/features/theme/components/ThemeToggle";

export function meta() {
	return [
		{ title: "Login" },
		{ name: "description", content: "Login to your account" },
	];
}

export default function Login() {
	return (
		<div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
			<div className="absolute top-4 right-4">
				<ThemeToggle />
			</div>
			<div className="w-full max-w-sm">
				<LoginForm />
			</div>
		</div>
	);
}
