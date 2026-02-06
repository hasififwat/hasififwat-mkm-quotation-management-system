import { useState } from "react";
import { Link, useNavigate } from "react-router";
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
import { cn } from "~/lib/utils";

export function RegistrationForm({
	className,
	...props
}: React.ComponentProps<"div">) {
	const navigate = useNavigate();
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [confirmPassword, setConfirmPassword] = useState("");
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [success, setSuccess] = useState(false);

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setLoading(true);
		setError(null);
		setSuccess(false);

		// Validate passwords match
		if (password !== confirmPassword) {
			setError("Passwords do not match");
			setLoading(false);
			return;
		}

		// Validate password strength
		if (password.length < 6) {
			setError("Password must be at least 6 characters long");
			setLoading(false);
			return;
		}

		try {
			setSuccess(true);

			// Automatically sign in the user after successful registration

			// Navigate to dashboard
			navigate("/dashboard");
		} catch (err) {
			setError(err instanceof Error ? err.message : "Failed to create account");
		} finally {
			setLoading(false);
		}
	};

	return (
		<div className={cn("flex flex-col gap-6", className)} {...props}>
			<Card>
				<CardHeader>
					<CardTitle>Create an account</CardTitle>
					<CardDescription>
						Enter your information below to create your account
					</CardDescription>
				</CardHeader>
				<CardContent>
					<form onSubmit={handleSubmit}>
						<FieldGroup>
							<Field>
								<FieldLabel htmlFor="register-email">Email</FieldLabel>
								<Input
									id="register-email"
									type="email"
									placeholder="m@example.com"
									value={email}
									onChange={(e) => setEmail(e.target.value)}
									required
									disabled={loading}
								/>
							</Field>
							<Field>
								<FieldLabel htmlFor="register-password">Password</FieldLabel>

								<Input
									id="register-password"
									type="password"
									placeholder="Create a password"
									value={password}
									onChange={(e) => setPassword(e.target.value)}
									required
									disabled={loading}
									minLength={6}
								/>
							</Field>
							<Field>
								<FieldLabel htmlFor="register-confirm-password">
									Confirm Password
								</FieldLabel>
								<Input
									id="register-confirm-password"
									type="password"
									placeholder="Confirm your password"
									value={confirmPassword}
									onChange={(e) => setConfirmPassword(e.target.value)}
									required
									disabled={loading}
									minLength={6}
								/>
							</Field>
							{error && <div className="text-sm text-red-500">{error}</div>}
							{success && (
								<div className="text-sm text-green-600">
									Account created successfully! Please check your email to
									verify your account.
								</div>
							)}
							<Field>
								<Button type="submit" disabled={loading}>
									{loading ? "Creating account..." : "Create account"}
								</Button>
								<FieldDescription className="text-center">
									Already have an account? <Link to="/">Login</Link>
								</FieldDescription>
							</Field>
						</FieldGroup>
					</form>
				</CardContent>
			</Card>
		</div>
	);
}
