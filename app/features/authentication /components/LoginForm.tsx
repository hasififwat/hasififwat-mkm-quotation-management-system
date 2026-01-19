import { Form, useActionData, useNavigation, Link } from "react-router";
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

// Define the shape of the data returned by the action
interface ActionResponse {
  error?: string;
}

export function LoginForm({
  className,
  ...props
}: React.ComponentProps<"div">) {
  // ✅ 1. Get the result from the server action (null if no submission yet)
  const actionData = useActionData() as ActionResponse | undefined;

  // ✅ 2. Check global navigation state to handle loading
  const navigation = useNavigation();
  const isSubmitting = navigation.state === "submitting";

  return (
    <div>
      <Card>
        <CardHeader>
          <CardTitle>Login to your account</CardTitle>
          <CardDescription>
            Enter your email below to login to your account
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* ✅ 3. Use React Router Form instead of HTML form */}
          <Form method="post">
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="email">Email</FieldLabel>
                <Input
                  id="email"
                  name="email" // Key for formData
                  type="email"
                  placeholder="m@example.com"
                  required
                />
              </Field>

              <Field>
                <div className="flex items-center">
                  <FieldLabel htmlFor="password">Password</FieldLabel>
                  {/* <Link
                      to="/forgot-password"
                      className="ml-auto inline-block text-sm underline-offset-4 hover:underline"
                    >
                      Forgot your password?
                    </Link> */}
                </div>
                <Input
                  id="password"
                  name="password" // Key for formData
                  type="password"
                  required
                />
              </Field>

              {/* ✅ 4. Display server errors here */}
              {actionData?.error && (
                <div className="text-sm text-red-500 font-medium">
                  {actionData.error}
                </div>
              )}

              <Field>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? "Logging in..." : "Login"}
                </Button>
                {/* <FieldDescription className="text-center">
                  Don&apos;t have an account? <Link to="/sign-up">Sign up</Link>
                </FieldDescription> */}
              </Field>
            </FieldGroup>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
