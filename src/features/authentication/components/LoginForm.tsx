"use client";

import { useAuthActions } from "@convex-dev/auth/react";
import { useConvexAuth } from "convex/react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "~/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "~/components/ui/card";
import { Field, FieldGroup, FieldLabel } from "~/components/ui/field";
import { Input } from "~/components/ui/input";

const inputClassName =
	"h-12 rounded-lg bg-muted/35 focus-visible:border-primary focus-visible:ring-primary/50 dark:bg-background";

export function LoginForm() {
	const { signIn } = useAuthActions();
	const { isAuthenticated } = useConvexAuth();
	const { push: navigate } = useRouter();
	const [error, setError] = useState<string | null>(null);
	const [isSubmitting, setIsSubmitting] = useState(false);

	useEffect(() => {
		if (isAuthenticated) {
			navigate("/packages");
		}
	}, [isAuthenticated, navigate]);

	const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
		e.preventDefault();
		setError(null);
		setIsSubmitting(true);

		const formData = new FormData(e.currentTarget);
		const email = formData.get("email") as string;
		const password = formData.get("password") as string;

		try {
			await signIn("password", { email, password, flow: "signIn" });
			// navigation happens via useEffect once isAuthenticated becomes true
		} catch {
			setError("Invalid email or password.");
			setIsSubmitting(false);
		}
	};

	return (
		<div>
			<Card className="gap-8 rounded-3xl py-7 shadow-xl shadow-foreground/8 sm:py-9 dark:shadow-black/25">
				<CardHeader className="px-5 before:mb-2 before:h-1 before:w-8 before:rounded-full before:bg-primary sm:px-8">
					<CardTitle className="text-3xl leading-tight tracking-tight text-balance sm:text-4xl">
						Login to your account
					</CardTitle>
					<CardDescription className="text-base leading-relaxed">
						Enter your email below to login to your account
					</CardDescription>
				</CardHeader>
				<CardContent className="px-5 sm:px-8">
					<form onSubmit={handleSubmit}>
						<FieldGroup className="gap-5">
							<Field className="gap-2">
								<FieldLabel htmlFor="email">Email</FieldLabel>
								<Input
									id="email"
									name="email"
									type="email"
									placeholder="m@example.com"
									className={inputClassName}
									required
									disabled={isSubmitting}
								/>
							</Field>

							<Field className="gap-2">
								<FieldLabel htmlFor="password">Password</FieldLabel>
								<Input
									id="password"
									name="password"
									type="password"
									className={inputClassName}
									required
									disabled={isSubmitting}
								/>
							</Field>

							{error && (
								<div className="rounded-lg border border-destructive/30 bg-destructive/8 px-3 py-2.5 text-sm leading-relaxed font-medium wrap-anywhere">
									{error}
								</div>
							)}

							<Field>
								<Button
									type="submit"
									disabled={isSubmitting}
									className="h-12 w-full rounded-lg text-base font-semibold shadow-xs"
								>
									{isSubmitting ? "Logging in..." : "Login"}
								</Button>
							</Field>
						</FieldGroup>
					</form>
				</CardContent>
			</Card>
		</div>
	);
}
