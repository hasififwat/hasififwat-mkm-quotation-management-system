"use client";

import { useMutation } from "convex/react";
import { api } from "convex/_generated/api";
import { useState } from "react";
import Link from "next/link";
import { Button } from "~/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "~/components/ui/card";
import {
	Field,
	FieldDescription,
	FieldGroup,
	FieldLabel,
} from "~/components/ui/field";
import { Input } from "~/components/ui/input";

const inputClassName =
	"h-12 rounded-lg bg-muted/35 focus-visible:border-primary focus-visible:ring-primary/50 dark:bg-background";

export function RegistrationForm() {
	const createUserAccount = useMutation(api.profiles.createUserAccount);

	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [success, setSuccess] = useState(false);

	const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
		e.preventDefault();
		setLoading(true);
		setError(null);
		setSuccess(false);

		const formData = new FormData(e.currentTarget);
		const email = formData.get("email") as string;
		const password = formData.get("password") as string;
		const confirmPassword = formData.get("confirmPassword") as string;
		const fullName = formData.get("fullName") as string;
		const branch = formData.get("branch") as string;
		const unit = (formData.get("unit") as string) || undefined;

		if (password !== confirmPassword) {
			setError("Passwords do not match");
			setLoading(false);
			return;
		}

		if (password.length < 8) {
			setError("Password must be at least 8 characters long");
			setLoading(false);
			return;
		}

		try {
			await createUserAccount({ email, password, fullName, branch, unit });
			setSuccess(true);
			(e.target as HTMLFormElement).reset();
		} catch (err) {
			setError(err instanceof Error ? err.message : "Failed to create account");
		} finally {
			setLoading(false);
		}
	};

	return (
		<Card className="gap-7 rounded-3xl py-7 shadow-xl shadow-foreground/8 sm:py-9 dark:shadow-black/25">
			<CardHeader className="px-5 before:mb-2 before:h-1 before:w-8 before:rounded-full before:bg-primary sm:px-8">
				<CardTitle className="text-3xl leading-tight tracking-tight text-balance sm:text-4xl">
					Create Agent Account
				</CardTitle>
				<CardDescription className="text-base leading-relaxed">
					Create a new login account for an agent. They can sign in immediately
					after.
				</CardDescription>
			</CardHeader>
			<CardContent className="px-5 sm:px-8">
				<form onSubmit={handleSubmit}>
					<FieldGroup className="grid grid-cols-1 gap-4 sm:grid-cols-2">
						<Field className="gap-2 sm:col-span-2">
							<FieldLabel htmlFor="fullName">Full Name</FieldLabel>
							<Input
								id="fullName"
								name="fullName"
								type="text"
								placeholder="Ahmad bin Ali"
								className={inputClassName}
								required
								disabled={loading}
							/>
						</Field>
						<Field className="gap-2">
							<FieldLabel htmlFor="branch">Branch</FieldLabel>
							<Input
								id="branch"
								name="branch"
								type="text"
								placeholder="KL"
								className={inputClassName}
								required
								disabled={loading}
							/>
						</Field>
						<Field className="gap-2">
							<FieldLabel htmlFor="unit">Unit (optional)</FieldLabel>
							<Input
								id="unit"
								name="unit"
								type="text"
								placeholder="Unit A"
								className={inputClassName}
								disabled={loading}
							/>
						</Field>
						<Field className="gap-2 sm:col-span-2">
							<FieldLabel htmlFor="email">Email</FieldLabel>
							<Input
								id="email"
								name="email"
								type="email"
								placeholder="agent@example.com"
								className={inputClassName}
								required
								disabled={loading}
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
								disabled={loading}
								minLength={8}
							/>
						</Field>
						<Field className="gap-2">
							<FieldLabel htmlFor="confirmPassword">Confirm Password</FieldLabel>
							<Input
								id="confirmPassword"
								name="confirmPassword"
								type="password"
								className={inputClassName}
								required
								disabled={loading}
								minLength={8}
							/>
						</Field>

						{error && (
							<div className="rounded-lg border border-destructive/30 bg-destructive/8 px-3 py-2.5 text-sm leading-relaxed font-medium wrap-anywhere sm:col-span-2">
								{error}
							</div>
						)}
						{success && (
							<div className="rounded-lg border border-emerald-600/30 bg-emerald-600/10 px-3 py-2.5 text-sm leading-relaxed font-medium text-emerald-800 sm:col-span-2 dark:border-emerald-400/25 dark:bg-emerald-400/10 dark:text-emerald-200">
								Account created successfully! The agent can now sign in.
							</div>
						)}

						<Field className="gap-2 pt-1 sm:col-span-2">
							<Button
								type="submit"
								disabled={loading}
								className="h-12 w-full rounded-lg text-base font-semibold shadow-xs"
							>
								{loading ? "Creating account..." : "Create Account"}
							</Button>
							<FieldDescription className="text-center">
								<Link
									href="/packages"
									className="inline-flex min-h-11 items-center rounded-md px-3 font-medium text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
								>
									Back to Packages
								</Link>
							</FieldDescription>
						</Field>
					</FieldGroup>
				</form>
			</CardContent>
		</Card>
	);
}
