import { RegistrationForm } from "~/features/authentication /components/RegistrationForm";
import { ThemeToggle } from "~/features/theme/components/ThemeToggle";

export function meta() {
	return [
		{ title: "Sign Up" },
		{ name: "description", content: "Create a new account" },
	];
}

export default function SignUp() {
	return (
		<div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
			<div className="absolute top-4 right-4">
				<ThemeToggle />
			</div>
			<div className="w-full max-w-sm">
				<RegistrationForm />
			</div>
		</div>
	);
}
