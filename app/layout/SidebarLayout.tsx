import { FileText, Home, LogOut, Menu, Package } from "lucide-react";
import type { ReactNode } from "react";
import { Form, Link } from "react-router"; // ✅ Import Form
import { Button } from "~/components/ui/button";
import {
	Sidebar,
	SidebarContent,
	SidebarFooter,
	SidebarGroup,
	SidebarGroupContent,
	SidebarGroupLabel,
	SidebarHeader,
	SidebarInset,
	SidebarMenu,
	SidebarMenuButton,
	SidebarMenuItem,
	SidebarProvider,
	SidebarTrigger,
} from "~/components/ui/sidebar";
import { ThemeToggle } from "~/features/theme/components/ThemeToggle";

const menuItems = [
	// {
	//   title: "Dashboard",
	//   icon: Home,
	//   url: "/dashboard",
	// },
	{
		title: "Packages",
		icon: Package,
		url: "/packages",
	},
	{
		title: "Quotations",
		icon: FileText,
		url: "/quotations",
	},
];

interface SidebarLayoutProps {
	children: ReactNode;
	title?: string;
	profile?: any; // ✅ Add profile prop (you can replace 'any' with your actual profile type)
}

export function SidebarLayout({
	children,
	title,

	profile,
}: SidebarLayoutProps) {
	return (
		<SidebarProvider>
			<Sidebar>
				<SidebarHeader className="border-b px-6 py-4">
					<div className="flex items-center gap-2">
						<div className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
							<Home className="size-4" />
						</div>
						<span className="text-lg font-semibold">MKM Quotation</span>
					</div>
				</SidebarHeader>

				<SidebarContent>
					<SidebarGroup>
						<SidebarGroupLabel>Navigation</SidebarGroupLabel>
						<SidebarGroupContent>
							<SidebarMenu>
								{menuItems.map((item) => (
									<SidebarMenuItem key={item.title}>
										<SidebarMenuButton asChild>
											<Link to={item.url}>
												<item.icon className="size-4" />
												<span>{item.title}</span>
											</Link>
										</SidebarMenuButton>
									</SidebarMenuItem>
								))}
							</SidebarMenu>
						</SidebarGroupContent>
					</SidebarGroup>
				</SidebarContent>

				<SidebarFooter className="border-t p-4">
					<div className="flex flex-col gap-2">
						<div className="flex items-center gap-2 px-2 py-1.5">
							<div className="flex size-8 items-center justify-center rounded-full bg-muted">
								<span className="text-sm font-medium">
									{profile?.full_name
										? profile.full_name.charAt(0).toUpperCase()
										: "U"}
								</span>
							</div>
							<div className="flex-1 overflow-hidden">
								<p className="text-sm font-medium truncate">
									{profile.full_name || "User"}
									<p className="text-xs text-muted-foreground">
										{profile.email || "user@example.com"}
									</p>
								</p>
							</div>
						</div>

						{/* ✅ NEW: Logout via Server Action */}
						<Form action="/logout" method="post" className="w-full">
							<Button
								variant="outline"
								size="sm"
								type="submit"
								className="w-full justify-start"
							>
								<LogOut className="size-4 mr-2" />
								Sign Out
							</Button>
						</Form>
					</div>
				</SidebarFooter>
			</Sidebar>
			<SidebarInset className="overflow-hidden">
				<header className="sticky top-0 z-10 flex h-16 items-center gap-4 border-b bg-background px-6 print:hidden">
					<SidebarTrigger>
						<Menu className="size-5" />
					</SidebarTrigger>
					<div className="flex-1">
						{title && <h1 className="text-lg font-semibold">{title}</h1>}
					</div>
					<ThemeToggle />
				</header>
				<main className="grid grid-cols-12  w-full">{children}</main>
			</SidebarInset>
		</SidebarProvider>
	);
}
