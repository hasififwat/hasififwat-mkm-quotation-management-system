import { Password } from "@convex-dev/auth/providers/Password";
import { convexAuth } from "@convex-dev/auth/server";

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [Password({
    profile(params) {
      if (params.flow === "signUp") throw new Error("Self-registration is disabled");
      if (typeof params.email !== "string" || !params.email.trim()) throw new Error("Email is required");
      return { email: params.email };
    },
  })],
});
