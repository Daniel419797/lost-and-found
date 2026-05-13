"use client";

import Link from "next/link";
import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  Bell,
  FileCheck,
  LayoutDashboard,
  MapPin,
  Menu,
  Package,
  Search,
  Settings,
  ShieldCheck,
  X,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { LinkButton } from "@/components/ui/link-button";
import { useAuth } from "@/context/AuthContext";
import { cn } from "@/lib/utils";

const navLinks = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/lost-reports", label: "Lost Reports", icon: Search },
  { href: "/found-reports", label: "Found Reports", icon: Package },
  { href: "/search", label: "Browse & Search", icon: Search },
  { href: "/claims", label: "Claims", icon: FileCheck },
  { href: "/notifications", label: "Notifications", icon: Bell },
  { href: "/admin", label: "Admin", icon: ShieldCheck, roles: ["admin", "super_admin"] },
  { href: "/profile", label: "Profile", icon: Settings },
];

const routeTitles: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/lost-reports": "Lost Reports",
  "/found-reports": "Found Reports",
  "/search": "Browse & Search",
  "/claims": "Claims",
  "/notifications": "Notifications",
  "/admin": "Admin",
  "/profile": "Profile",
};

function UserMenu({
  initials,
  onLogout,
  isMobile,
}: {
  initials: string;
  onLogout: () => Promise<void>;
  isMobile: boolean;
}) {
  const { user } = useAuth();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="rounded-full cursor-pointer focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none">
        <Avatar className="h-8 w-8">
          <AvatarFallback className="text-xs">{initials}</AvatarFallback>
        </Avatar>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <div className="px-2 py-1.5 text-sm font-medium">{user?.displayName}</div>
        <div className="px-2 pb-1.5 text-xs text-muted-foreground truncate">{user?.email}</div>
        <DropdownMenuSeparator />
        {isMobile && (
          <>
            <DropdownMenuItem>
              <Link href="/lost-reports" className="w-full">
                Report Lost Item
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem>
              <Link href="/found-reports" className="w-full">
                Report Found Item
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
          </>
        )}
        <DropdownMenuItem>
          <Link href="/profile" className="w-full">
            Profile &amp; Settings
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={onLogout} className="text-destructive focus:text-destructive">
          Log out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const currentTitle = routeTitles[pathname] || "CampusLostFound";

  const initials = (user?.displayName || "U")
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const handleLogout = async () => {
    await logout();
    router.push("/login");
  };

  const closeMobileSidebar = () => setIsMobileSidebarOpen(false);

  return (
    <div className="min-h-screen bg-muted/40">
      <div className="grid min-h-screen w-full grid-cols-1 md:grid-cols-[250px_1fr]">
        {/* Desktop sidebar */}
        <aside className="hidden h-[100dvh] max-h-[100dvh] overflow-y-auto border-r bg-background md:sticky md:top-0 md:flex md:flex-col">
          <div className="flex h-16 items-center border-b px-5">
            <Link href="/dashboard" className="flex items-center gap-2 font-semibold">
              <span className="rounded-md bg-foreground p-1.5 text-background">
                <MapPin className="h-4 w-4" />
              </span>
              CampusLostFound
            </Link>
          </div>

          <nav className="space-y-1 px-3 py-4">
            {navLinks.map(({ href, label, icon: Icon, roles }) => {
              if (roles && !roles.includes(user?.role || "")) {
                return null;
              }
              const active = pathname === href || pathname.startsWith(href + "/");
              return (
                <LinkButton
                  key={href}
                  href={href}
                  variant={active ? "secondary" : "ghost"}
                  className={cn("w-full justify-start gap-2", active && "font-semibold")}
                >
                  <Icon className="h-4 w-4" />
                  {label}
                </LinkButton>
              );
            })}
          </nav>

          <div className="mt-auto border-t p-4">
            <div className="flex items-center gap-3 rounded-xl border p-3">
              <Avatar className="h-8 w-8">
                <AvatarFallback className="text-xs">{initials}</AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">{user?.displayName}</p>
                <p className="truncate text-xs text-muted-foreground capitalize">
                  {user?.role ?? "member"}
                </p>
              </div>
            </div>
          </div>
        </aside>

        {/* Mobile sidebar overlay */}
        {isMobileSidebarOpen && (
          <div
            className="fixed inset-0 z-50 md:hidden"
            role="dialog"
            aria-modal="true"
            aria-label="Navigation menu"
          >
            <button
              type="button"
              onClick={closeMobileSidebar}
              className="absolute inset-0 bg-black/40"
              aria-label="Close navigation menu"
            />
            <aside className="relative z-10 flex h-[100dvh] max-h-[100dvh] w-[84vw] max-w-[300px] flex-col overflow-y-auto border-r bg-background">
              <div className="flex h-16 items-center justify-between border-b px-5">
                <Link
                  href="/dashboard"
                  className="flex items-center gap-2 font-semibold"
                  onClick={closeMobileSidebar}
                >
                  <span className="rounded-md bg-foreground p-1.5 text-background">
                    <MapPin className="h-4 w-4" />
                  </span>
                  CampusLostFound
                </Link>
                <button
                  type="button"
                  onClick={closeMobileSidebar}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-md border hover:bg-muted"
                  aria-label="Close menu"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <nav className="space-y-1 px-3 py-4">
                {navLinks.map(({ href, label, icon: Icon, roles }) => {
                  if (roles && !roles.includes(user?.role || "")) {
                    return null;
                  }
                  const active = pathname === href || pathname.startsWith(href + "/");
                  return (
                    <LinkButton
                      key={href}
                      href={href}
                      onClick={closeMobileSidebar}
                      variant={active ? "secondary" : "ghost"}
                      className={cn("w-full justify-start gap-2", active && "font-semibold")}
                    >
                      <Icon className="h-4 w-4" />
                      {label}
                    </LinkButton>
                  );
                })}
              </nav>
            </aside>
          </div>
        )}

        {/* Main content area */}
        <div className="min-w-0">
          <header className="sticky top-0 z-40 border-b bg-background">
            <div className="flex h-16 items-center justify-between px-4">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setIsMobileSidebarOpen(true)}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-md border hover:bg-muted md:hidden"
                  aria-label="Open navigation menu"
                >
                  <Menu className="h-4 w-4" />
                </button>
                <Link href="/dashboard" className="flex items-center gap-2 font-semibold">
                  <span className="rounded-md bg-foreground p-1.5 text-background">
                    <MapPin className="h-4 w-4" />
                  </span>
                  CampusLostFound
                </Link>
                <p className="hidden text-sm font-semibold uppercase tracking-[0.12em] text-muted-foreground lg:block">
                  {currentTitle}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <div className="hidden items-center gap-2 md:flex">
                  <LinkButton href="/lost-reports" size="sm">
                    Report Lost
                  </LinkButton>
                  <LinkButton href="/found-reports" size="sm" variant="outline">
                    Report Found
                  </LinkButton>
                </div>
                <div className="md:hidden">
                  <UserMenu initials={initials} onLogout={handleLogout} isMobile />
                </div>
                <div className="hidden md:block">
                  <UserMenu initials={initials} onLogout={handleLogout} isMobile={false} />
                </div>
              </div>
            </div>
          </header>

          <main className="min-w-0 p-4 md:p-6 lg:p-7">{children}</main>
        </div>
      </div>
    </div>
  );
}
