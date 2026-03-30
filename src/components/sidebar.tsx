"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth";
import { useTranslation, type Locale } from "@/lib/i18n";
import {
  LayoutDashboard,
  Phone,
  Users,
  ClipboardCheck,
  Database,
  Brain,
  FileDown,
  Webhook,
  UserCog,
  BookOpen,
  ChevronLeft,
  ChevronRight,
  Headphones,
  Activity,
  LogOut,
  User,
  Languages,
} from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

type NavKey = "dashboard" | "calls" | "agents" | "rules" | "export" | "logs" | "ingestion" | "ai" | "webhooks" | "users" | "docs";

const navItems: { href: string; key: NavKey; icon: React.ElementType }[] = [
  { href: "/", key: "dashboard", icon: LayoutDashboard },
  { href: "/calls", key: "calls", icon: Phone },
  { href: "/agents", key: "agents", icon: Users },
  { href: "/rules", key: "rules", icon: ClipboardCheck },
  { href: "/export", key: "export", icon: FileDown },
  { href: "/logs", key: "logs", icon: Activity },
  { href: "/settings/ingestion", key: "ingestion", icon: Database },
  { href: "/settings/ai", key: "ai", icon: Brain },
  { href: "/settings/webhooks", key: "webhooks", icon: Webhook },
  { href: "/users", key: "users", icon: UserCog },
  { href: "/docs", key: "docs", icon: BookOpen },
];

export function Sidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const { user, logout } = useAuth();
  const { locale, setLocale, t } = useTranslation();

  const toggleLocale = () => {
    setLocale(locale === "en" ? "ro" : "en" as Locale);
  };

  return (
    <aside
      className={cn(
        "flex flex-col border-r bg-card h-screen sticky top-0 overflow-hidden",
        collapsed ? "w-16" : "w-64"
      )}
    >
      {/* Logo */}
      <div className="flex items-center gap-2 px-4 h-16 border-b shrink-0">
        <Headphones className="h-6 w-6 text-primary shrink-0" />
        {!collapsed && (
          <span className="font-semibold text-lg tracking-tight whitespace-nowrap">
            CallQA
          </span>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 flex flex-col py-4 gap-1 px-2 overflow-y-auto overflow-x-hidden">
        {navItems.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href !== "/" && pathname.startsWith(item.href));
          const label = t.sidebar[item.key];

          const link = (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center rounded-md py-2 text-sm font-medium transition-colors whitespace-nowrap overflow-hidden shrink-0",
                collapsed ? "justify-center px-0" : "gap-3 px-3",
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              )}
            >
              <item.icon className="h-4 w-4 shrink-0" />
              {!collapsed && <span>{label}</span>}
            </Link>
          );

          if (collapsed) {
            return (
              <Tooltip key={item.href}>
                <TooltipTrigger>{link}</TooltipTrigger>
                <TooltipContent side="right">{label}</TooltipContent>
              </Tooltip>
            );
          }
          return link;
        })}
      </nav>

      <Separator />

      {/* Language switch */}
      <div className={cn("px-2 py-1.5 shrink-0", collapsed ? "text-center" : "")}>
        {collapsed ? (
          <Tooltip>
            <TooltipTrigger>
              <Button variant="ghost" size="icon" onClick={toggleLocale} className="w-full">
                <Languages className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right">
              {locale === "en" ? "Romana" : "English"}
            </TooltipContent>
          </Tooltip>
        ) : (
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start gap-2 px-3 whitespace-nowrap overflow-hidden"
            onClick={toggleLocale}
          >
            <Languages className="h-4 w-4 shrink-0" />
            {locale === "en" ? "Romana" : "English"}
          </Button>
        )}
      </div>

      {/* User info + logout */}
      {user && (
        <div className={cn("px-2 py-2 shrink-0", collapsed ? "text-center" : "")}>
          {collapsed ? (
            <Tooltip>
              <TooltipTrigger>
                <Button variant="ghost" size="icon" onClick={logout} className="w-full">
                  <LogOut className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right">
                {user.full_name || user.username} — {t.sidebar.signOut}
              </TooltipContent>
            </Tooltip>
          ) : (
            <div className="flex items-center gap-2 px-2 whitespace-nowrap overflow-hidden">
              <div className="rounded-full bg-primary/10 p-1.5">
                <User className="h-3.5 w-3.5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{user.full_name || user.username}</p>
                <p className="text-xs text-muted-foreground truncate">{user.role}</p>
              </div>
              <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={logout}>
                <LogOut className="h-3.5 w-3.5" />
              </Button>
            </div>
          )}
        </div>
      )}

      <Separator />

      {/* Collapse toggle */}
      <div className="p-2 shrink-0">
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-center"
          onClick={() => setCollapsed(!collapsed)}
        >
          {collapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <ChevronLeft className="h-4 w-4" />
          )}
        </Button>
      </div>
    </aside>
  );
}
