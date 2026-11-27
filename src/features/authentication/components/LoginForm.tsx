"use client";

import { useAuthActions } from "@convex-dev/auth/react";
import { useConvexAuth } from "convex/react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "~/components/ui/button";
import { Field, FieldGroup, FieldLabel } from "~/components/ui/field";
import { Input } from "~/components/ui/input";

const inputClassName =
	"h-12 rounded-xl bg-background px-3.5 focus-visible:border-primary focus-visible:ring-primary/50 dark:bg-background";

type SignInStatus = "idle" | "submitting" | "failed";

export function LoginForm() {
	const { signIn } = useAuthActions();
	const { isAuthenticated } = useConvexAuth();
	const { push: navigate } = useRouter();
	const [status, setStatus] = useState<SignInStatus>("idle");
	const isSubmitting = status === "submitting";

	useEffect(() => {
		if (isAuthenticated) {
			navigate("/packages");
		}
	}, [isAuthenticated, navigate]);

	const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
		e.preventDefault();
		if (isSubmitting) return;

		setStatus("submitting");

		const formData = new FormData(e.currentTarget);
		const email = formData.get("email") as string;
		const password = formData.get("password") as string;

		try {
			await signIn("password", { email, password, flow: "signIn" });
		} catch {
			setStatus("failed");
		}
	};

	return (
		<>
			<h1 className="text-3xl font-semibold tracking-[-0.04em] lg:text-4xl">
				Sign in
			</h1>
			<p className="mt-2 text-sm leading-relaxed text-muted-foreground sm:text-base">
				Use your MKM agent account.
			</p>

			<form
				className="mt-7 sm:mt-8"
				method="post"
				onSubmit={handleSubmit}
				aria-busy={isSubmitting}
			>
				<FieldGroup className="gap-5">
					<Field className="gap-2">
						<FieldLabel htmlFor="email">Email</FieldLabel>
						<Input
							id="email"
							name="email"
							type="email"
							autoComplete="username"
							className={inputClassName}
							required
							readOnly={isSubmitting}
						/>
					</Field>

					<Field className="gap-2">
						<FieldLabel htmlFor="password">Password</FieldLabel>
						<Input
							id="password"
							name="password"
							type="password"
							autoComplete="current-password"
							className={inputClassName}
							required
							readOnly={isSubmitting}
						/>
					</Field>

					{status === "failed" ? (
						<p
							role="alert"
							className="rounded-lg border border-destructive/30 bg-destructive/8 px-3 py-2.5 text-sm leading-relaxed font-medium"
						>
							Invalid email or password.
						</p>
					) : null}

					<Button
						type="submit"
						aria-disabled={isSubmitting}
						className="mt-1 h-12 w-full rounded-xl text-base font-semibold aria-disabled:opacity-60 aria-disabled:hover:bg-primary"
					>
						{isSubmitting ? "Signing in…" : "Sign in"}
					</Button>
				</FieldGroup>
			</form>
			<span role="status" className="sr-only">
				{isSubmitting ? "Signing in…" : ""}
			</span>
		</>
	);
}
