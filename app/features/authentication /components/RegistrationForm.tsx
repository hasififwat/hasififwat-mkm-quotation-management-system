import { useMutation } from "convex/react";
import { api } from "convex/_generated/api";
import { useState } from "react";
import { Link } from "react-router";
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
		<Card>
			<CardHeader>
				<CardTitle>Create Agent Account</CardTitle>
				<CardDescription>
					Create a new login account for an agent. They can sign in immediately
					after.
				</CardDescription>
			</CardHeader>
			<CardContent>
				<form onSubmit={handleSubmit}>
					<FieldGroup>
						<Field>
							<FieldLabel htmlFor="fullName">Full Name</FieldLabel>
							<Input
								id="fullName"
								name="fullName"
								type="text"
								placeholder="Ahmad bin Ali"
								required
								disabled={loading}
							/>
						</Field>
						<Field>
							<FieldLabel htmlFor="branch">Branch</FieldLabel>
							<Input
								id="branch"
								name="branch"
								type="text"
								placeholder="KL"
								required
								disabled={loading}
							/>
						</Field>
						<Field>
							<FieldLabel htmlFor="unit">Unit (optional)</FieldLabel>
							<Input
								id="unit"
								name="unit"
								type="text"
								placeholder="Unit A"
								disabled={loading}
							/>
						</Field>
						<Field>
							<FieldLabel htmlFor="email">Email</FieldLabel>
							<Input
								id="email"
								name="email"
								type="email"
								placeholder="agent@example.com"
								required
								disabled={loading}
							/>
						</Field>
						<Field>
							<FieldLabel htmlFor="password">Password</FieldLabel>
							<Input
								id="password"
								name="password"
								type="password"
								required
								disabled={loading}
								minLength={8}
							/>
						</Field>
						<Field>
							<FieldLabel htmlFor="confirmPassword">Confirm Password</FieldLabel>
							<Input
								id="confirmPassword"
								name="confirmPassword"
								type="password"
								required
								disabled={loading}
								minLength={8}
							/>
						</Field>

						{error && <div className="text-sm text-red-500">{error}</div>}
						{success && (
							<div className="text-sm text-green-600">
								Account created successfully! The agent can now sign in.
							</div>
						)}

						<Field>
							<Button type="submit" disabled={loading} className="w-full">
								{loading ? "Creating account..." : "Create Account"}
							</Button>
							<FieldDescription className="text-center">
								<Link to="/packages">Back to Packages</Link>
							</FieldDescription>
						</Field>
					</FieldGroup>
				</form>
			</CardContent>
		</Card>
	);
}
