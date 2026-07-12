import { redirect } from "react-router";

export async function loader() {
	return redirect("/");
}

export async function action() {
	return redirect("/");
}
