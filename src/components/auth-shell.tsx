"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { AuthProvider, useAuth } from "@/lib/auth";
import { I18nProvider } from "@/lib/i18n";
import { Sidebar } from "@/components/sidebar";
import { ErrorBoundary } from "@/components/error-boundary";
import { Loader2 } from "lucide-react";

const PUBLIC_PATHS = ["/login"];

// Map URL paths to page keys for permission checking
const PATH_TO_PAGE_KEY: Record<string, string> = {
  "/calls": "calls",
  "/agents": "agents",
  "/rules": "rules",
  "/export": "export",
  "/logs": "logs",
  "/settings/ingestion": "ingestion",
  "/settings/ai": "ai",
  "/settings/webhooks": "webhooks",
  "/users": "users",
  "/docs": "docs",
};

function isPageAllowed(pathname: string, user: { allowed_pages?: string[]; role?: string } | null): boolean {
  if (!user) return false;
  if (user.role === "admin") return true;
  if (!user.allowed_pages?.length) return true; // empty = all pages
  if (pathname === "/") return true; // dashboard always allowed

  // Check each path prefix
  for (const [path, key] of Object.entries(PATH_TO_PAGE_KEY)) {
    if (pathname.startsWith(path)) {
      return user.allowed_pages.includes(key);
    }
  }
  return true; // unknown paths are allowed
}

function AppShell({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  const isPublicPage = PUBLIC_PATHS.some((p) => pathname.startsWith(p));

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!loading && !user && !isPublicPage) {
      router.replace("/login");
    }
  }, [loading, user, isPublicPage, router]);

  // Redirect to dashboard after login
  useEffect(() => {
    if (!loading && user && isPublicPage) {
      router.replace("/");
    }
  }, [loading, user, isPublicPage, router]);

  // Redirect to dashboard if page not allowed
  useEffect(() => {
    if (!loading && user && !isPublicPage && !isPageAllowed(pathname, user)) {
      router.replace("/");
    }
  }, [loading, user, isPublicPage, pathname, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Public page (login) — no sidebar
  if (isPublicPage) {
    return <>{children}</>;
  }

  // Not authenticated — show nothing while redirecting
  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Authenticated — full layout with sidebar
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-7xl mx-auto p-6">
          <ErrorBoundary>{children}</ErrorBoundary>
        </div>
      </main>
    </div>
  );
}

export function AuthShell({ children }: { children: React.ReactNode }) {
  return (
    <I18nProvider>
      <AuthProvider>
        <AppShell>{children}</AppShell>
      </AuthProvider>
    </I18nProvider>
  );
}
