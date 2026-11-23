"use client";

import { useAuthActions } from "@convex-dev/auth/react";
import { ChevronRight, FileText, Home, LogOut, Menu, Package, Plane, RefreshCw, Users } from "lucide-react";
import type { CSSProperties, ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Button } from "~/components/ui/button";
import { Separator } from "~/components/ui/separator";
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
	useSidebar,
} from "~/components/ui/sidebar";
import { ThemeToggle } from "~/features/theme/components/ThemeToggle";

const menuItems = [
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
	{
		title: "Clients",
		icon: Users,
		url: "/clients",
	},
	{
		title: "Sync Packages",
		icon: RefreshCw,
		url: "/packages/sync",
	},
	{
		title: "Flight Audit",
		icon: Plane,
		url: "/flights/audit",
	},
];

const SidebarNavLink = ({
	item,
}: {
	item: {
		title: string;
		url: string;
		icon: React.ComponentType<{ className?: string }>;
	};
}) => {
	const { setOpenMobile, isMobile } = useSidebar();
	return (
		<SidebarMenuItem key={item.title}>
			<SidebarMenuButton
				asChild
				className="h-9 gap-3 px-3 font-medium [&>svg]:text-muted-foreground hover:[&>svg]:text-sidebar-accent-foreground focus-visible:bg-sidebar-accent focus-visible:text-sidebar-accent-foreground focus-visible:[&>svg]:text-sidebar-accent-foreground"
				onClick={() => isMobile && setOpenMobile(false)}
			>
				<Link href={item.url}>
					<item.icon className="size-4" />
					<span>{item.title}</span>
				</Link>
			</SidebarMenuButton>
		</SidebarMenuItem>
	);
};

interface SidebarLayoutProps {
	children: ReactNode;
	title?: string;
	profile?: any;
}

export function SidebarLayout({
	children,
	title,
	profile,
}: SidebarLayoutProps) {
	const { signOut } = useAuthActions();
	const router = useRouter();
	const pathname = usePathname();
	const packageEditorTitle =
		pathname === "/packages/create"
			? "Create Package"
			: /^\/packages\/edit\/[^/]+$/.test(pathname)
				? "Edit Package"
				: null;

	const handleSignOut = async () => {
		await signOut();
		router.push("/");
	};

	return (
		<SidebarProvider
			className="print:block print:min-h-0 print:[&>[data-slot=sidebar]]:hidden"
			style={{ "--sidebar-width": "15rem" } as CSSProperties}
		>
			<Sidebar variant="floating" className="pr-0 lg:p-4 lg:pr-0">
				<SidebarHeader className="h-16 shrink-0 justify-center border-b border-sidebar-border px-4 py-0">
					<div className="flex items-center gap-3">
						<div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
							<Home className="size-4" />
						</div>
						<span className="text-base font-semibold tracking-tight">
							MKM Quotation
						</span>
					</div>
				</SidebarHeader>

				<SidebarContent>
					<SidebarGroup className="px-3 py-4">
						<SidebarGroupLabel className="px-3 text-muted-foreground">
							Navigation
						</SidebarGroupLabel>
						<SidebarGroupContent>
							<SidebarMenu>
								{menuItems.map((item) => (
									<SidebarNavLink key={item.title} item={item} />
								))}
							</SidebarMenu>
						</SidebarGroupContent>
					</SidebarGroup>
				</SidebarContent>

				<SidebarFooter className="border-t border-sidebar-border p-3">
					<div className="flex flex-col gap-2">
						<div className="flex items-start gap-3 rounded-lg bg-muted/60 px-3 py-2.5">
							<div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-sidebar-accent text-sidebar-accent-foreground">
								<span className="text-sm font-medium">
									{profile?.full_name
										? profile.full_name.charAt(0).toUpperCase()
										: "U"}
								</span>
							</div>
							<div className="min-w-0 flex-1">
								<div className="text-sm font-medium leading-snug wrap-anywhere">
									{profile?.full_name || "User"}
									<p className="text-xs font-normal leading-snug text-muted-foreground">
										{profile?.email || ""}
									</p>
								</div>
							</div>
						</div>

						<Button
							variant="outline"
							size="sm"
							onClick={handleSignOut}
							className="w-full justify-start px-3"
						>
							<LogOut className="size-4 text-muted-foreground" />
							Sign Out
						</Button>
					</div>
				</SidebarFooter>
			</Sidebar>
			<SidebarInset className="min-w-0 overflow-clip md:m-2 md:rounded-lg md:bg-card md:shadow-sm md:ring-1 md:ring-border lg:m-4 print:m-0 print:overflow-visible print:rounded-none print:bg-background print:shadow-none print:ring-0">
				<header className="sticky top-0 z-10 flex h-14 shrink-0 items-center gap-3 border-b bg-card px-4 sm:gap-4 sm:px-6 md:h-16 print:hidden">
					<SidebarTrigger className="size-10">
						<Menu className="size-5" />
					</SidebarTrigger>
					{packageEditorTitle ? (
						<>
							<Separator orientation="vertical" className="hidden data-[orientation=vertical]:h-4 sm:block" />
							<nav aria-label="Breadcrumb" className="min-w-0 flex-1">
								<ol className="flex items-center gap-1">
									<li className="shrink-0">
										<Button
											asChild
											variant="ghost"
											size="sm"
											className="px-2 text-muted-foreground max-[360px]:px-1 max-[360px]:text-xs"
										>
											<Link href="/packages">Packages</Link>
										</Button>
									</li>
									<li className="flex min-w-0 items-center gap-1">
										<ChevronRight aria-hidden="true" className="size-3 shrink-0 text-muted-foreground" />
										<h1 aria-current="page" className="min-w-0 wrap-anywhere text-sm leading-tight font-semibold max-[360px]:text-xs">
											{packageEditorTitle}
										</h1>
									</li>
								</ol>
							</nav>
						</>
					) : (
						<div className="flex-1">
							{title && <h1 className="text-lg font-semibold">{title}</h1>}
						</div>
					)}
					<ThemeToggle />
				</header>
				<div className="grid w-full grid-cols-12">{children}</div>
			</SidebarInset>
		</SidebarProvider>
	);
}
