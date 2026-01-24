import { Home, LogOut, Menu, Package } from "lucide-react";
import { Link, Form } from "react-router"; // ✅ Import Form
import type { ReactNode } from "react";
import type { User } from "@supabase/supabase-js"; // ✅ Import User type
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
  {
    title: "Dashboard",
    icon: Home,
    url: "/dashboard",
  },
  {
    title: "Packages",
    icon: Package,
    url: "/packages",
  },
];

interface SidebarLayoutProps {
  children: ReactNode;
  title?: string;
  user: User | null;
}

export function SidebarLayout({ children, title, user }: SidebarLayoutProps) {
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
                  {user?.email?.charAt(0).toUpperCase() || "U"}
                </span>
              </div>
              <div className="flex-1 overflow-hidden">
                <p className="text-sm font-medium truncate">
                  {user?.email || "User"}
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
        <header className="sticky top-0 z-10 flex h-16 items-center gap-4 border-b bg-background px-6">
          <SidebarTrigger>
            <Menu className="size-5" />
          </SidebarTrigger>
          <div className="flex-1">
            {title && <h1 className="text-lg font-semibold">{title}</h1>}
          </div>
          <ThemeToggle />
        </header>
        <main className="flex-1 flex flex-col mx-auto p-6 w-full">
          {children}
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
