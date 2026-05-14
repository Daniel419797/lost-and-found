"use client";

import Link from "next/link";
import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  Bell,
  CircleHelp,
  CirclePlus,
  ClipboardCheck,
  Inbox,
  Landmark,
  LayoutDashboard,
  LogOut,
  Menu,
  PackageSearch,
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
import { useAuth } from "@/context/AuthContext";
import { cn } from "@/lib/utils";

const navLinks = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/lost-reports", label: "Lost Items", icon: Search },
  { href: "/found-reports", label: "Found Items", icon: Inbox },
  { href: "/claims", label: "Claims", icon: ClipboardCheck },
  { href: "/notifications", label: "Notifications", icon: Bell },
  { href: "/admin", label: "Admin", icon: ShieldCheck, roles: ["admin", "super_admin"] },
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

function UserMenu({ onLogout, className }: { onLogout: () => Promise<void>; className?: string }) {
  const { user } = useAuth();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={cn(
          "inline-flex size-10 items-center justify-center rounded-full bg-white text-[#007a6c] shadow-sm ring-1 ring-[#d0dbd9] transition hover:bg-[#f8fbfb] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#007a6c]",
          className,
        )}
      >
        <Landmark className="size-5" strokeWidth={2.6} />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56">
        <div className="px-2 py-1.5 text-sm font-semibold">{user?.displayName}</div>
        <div className="truncate px-2 pb-1.5 text-xs text-muted-foreground">{user?.email}</div>
        <DropdownMenuSeparator />
        <DropdownMenuItem>
          <Link href="/profile" className="w-full">
            Profile &amp; Settings
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem>
          <Link href="/notifications" className="w-full">
            Notifications
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={onLogout} className="text-destructive focus:text-destructive">
          <LogOut className="mr-2 size-4" />
          Log out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function SidebarContent({
  onLogout,
  onNavigate,
}: {
  onLogout: () => Promise<void>;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const { user } = useAuth();

  return (
    <div className="flex min-h-full flex-col px-5 py-8">
      <div className="flex items-start gap-4">
        <UserMenu onLogout={onLogout} className="mt-1" />
        <Link href="/dashboard" onClick={onNavigate} className="block min-w-0">
          <span className="block font-heading text-[1.7rem] font-bold leading-[1.08] tracking-normal text-[#101417]">
            Campus Lost &amp;
          </span>
          <span className="block font-heading text-[1.7rem] font-bold leading-[1.08] tracking-normal text-[#101417]">
            Found
          </span>
          <span className="mt-1 block text-lg leading-6 text-[#273235]">Institutional Recovery</span>
        </Link>
      </div>

      <Link
        href="/lost-reports"
        onClick={onNavigate}
        className="mt-14 inline-flex h-[54px] items-center justify-center gap-3 rounded-lg bg-[#007a6c] px-5 text-lg font-bold text-white shadow-sm transition hover:bg-[#006e62]"
      >
        <CirclePlus className="size-6" />
        Report Item
      </Link>

      <nav className="mt-10 space-y-3">
        {navLinks.map(({ href, label, icon: Icon, roles }) => {
          if (roles && !roles.includes(user?.role || "")) {
            return null;
          }
          const active = pathname === href || pathname.startsWith(href + "/");
          return (
            <Link
              key={href}
              href={href}
              onClick={onNavigate}
              className={cn(
                "flex h-[54px] items-center gap-5 rounded-lg px-6 text-lg font-medium text-[#182224] transition",
                active
                  ? "bg-[#078d80] font-semibold text-white"
                  : "hover:bg-white/70 hover:text-[#006d62]",
              )}
            >
              <Icon className="size-6 shrink-0" strokeWidth={2.3} />
              {label}
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto border-t border-[#b7c5c3] pt-7">
        <Link
          href="/profile"
          onClick={onNavigate}
          className="flex h-[48px] items-center gap-5 rounded-lg px-6 text-lg font-medium text-[#273235] transition hover:bg-white/70 hover:text-[#006d62]"
        >
          <Settings className="size-6" />
          Settings
        </Link>
        <a
          href="mailto:help@campuslostfound.local"
          className="mt-2 flex h-[48px] items-center gap-5 rounded-lg px-6 text-lg font-medium text-[#273235] transition hover:bg-white/70 hover:text-[#006d62]"
        >
          <CircleHelp className="size-6" />
          Help
        </a>
      </div>
    </div>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { logout } = useAuth();
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const currentTitle = routeTitles[pathname] || "Campus Lost & Found";

  const handleLogout = async () => {
    await logout();
    router.push("/login");
  };

  const closeMobileSidebar = () => setIsMobileSidebarOpen(false);

  return (
    <div className="min-h-screen bg-[#f7f8f8] text-[#101417]">
      <div className="grid min-h-screen w-full lg:grid-cols-[325px_minmax(0,1fr)]">
        <aside className="hidden min-h-screen border-r border-[#b7c5c3] bg-[#e9ecec] lg:flex lg:flex-col">
          <SidebarContent onLogout={handleLogout} />
        </aside>

        {isMobileSidebarOpen && (
          <div
            className="fixed inset-0 z-50 lg:hidden"
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
            <aside className="relative z-10 flex h-[100dvh] max-h-[100dvh] w-[86vw] max-w-[325px] flex-col overflow-y-auto border-r border-[#b7c5c3] bg-[#e9ecec]">
              <button
                type="button"
                onClick={closeMobileSidebar}
                className="absolute right-4 top-4 inline-flex size-9 items-center justify-center rounded-md border border-[#b7c5c3] bg-white text-[#273235]"
                aria-label="Close menu"
              >
                <X className="size-5" />
              </button>
              <SidebarContent
                onLogout={handleLogout}
                onNavigate={closeMobileSidebar}
              />
            </aside>
          </div>
        )}

        <div className="min-w-0">
          <header className="sticky top-0 z-40 flex h-16 items-center justify-between border-b border-[#d7dfdd] bg-[#f7f8f8]/95 px-4 backdrop-blur lg:hidden">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setIsMobileSidebarOpen(true)}
                className="inline-flex size-10 items-center justify-center rounded-md border border-[#b7c5c3] bg-white text-[#273235]"
                aria-label="Open navigation menu"
              >
                <Menu className="size-5" />
              </button>
              <div className="flex items-center gap-2 font-heading text-lg font-bold tracking-normal">
                <Landmark className="size-5 text-[#007a6c]" />
                {currentTitle}
              </div>
            </div>
            <Link
              href="/lost-reports"
              className="inline-flex size-10 items-center justify-center rounded-md bg-[#007a6c] text-white"
              aria-label="Report item"
            >
              <PackageSearch className="size-5" />
            </Link>
          </header>

          <main className="min-w-0 px-5 py-7 sm:px-8 lg:px-[30px] lg:py-[30px]">{children}</main>
        </div>
      </div>
    </div>
  );
}
