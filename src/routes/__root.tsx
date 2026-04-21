import { Outlet, Link, createRootRoute, HeadContent, Scripts, useRouterState } from "@tanstack/react-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { Toaster } from "@/components/ui/sonner";

import appCss from "../styles.css?url";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go to dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "MediSebi — Smart Medicine Supply & Demand Intelligence" },
      {
        name: "description",
        content:
          "Manage pharmacy inventory, track expiry, prevent shortages, and get smart redistribution suggestions with MediSebi.",
      },
      { property: "og:title", content: "MediSebi — Smart Medicine Supply & Demand Intelligence" },
      { name: "twitter:title", content: "MediSebi — Smart Medicine Supply & Demand Intelligence" },
      { name: "description", content: "TradeViz Explorer visualizes trade data with interactive charts and live updates." },
      { property: "og:description", content: "TradeViz Explorer visualizes trade data with interactive charts and live updates." },
      { name: "twitter:description", content: "TradeViz Explorer visualizes trade data with interactive charts and live updates." },
      { property: "og:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/3af1eab7-8247-4b7f-91af-6934b996bc9b/id-preview-19b24567--b28df32b-6457-4e94-bcf8-4250090e2d0b.lovable.app-1776547490996.png" },
      { name: "twitter:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/3af1eab7-8247-4b7f-91af-6934b996bc9b/id-preview-19b24567--b28df32b-6457-4e94-bcf8-4250090e2d0b.lovable.app-1776547490996.png" },
      { name: "twitter:card", content: "summary_large_image" },
      { property: "og:type", content: "website" },
    ],
    links: [{ rel: "stylesheet", href: appCss }],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function PageHeader() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const titles: Record<string, string> = {
    "/": "Dashboard",
    "/billing": "Billing",
    "/inventory": "Inventory",
    "/alerts": "Alerts & Insights",
    "/orders": "Orders",
    "/analytics": "Trade Analytics",
    "/marketplace": "Friendly Trade",
    "/redistribution": "Redistribution",
  };
  return (
    <header className="sticky top-0 z-10 flex h-14 items-center gap-3 border-b border-border bg-background/80 px-4 backdrop-blur">
      <SidebarTrigger />
      <h1 className="text-base font-semibold text-foreground">{titles[pathname] ?? "MediSebi"}</h1>
    </header>
  );
}

function RootComponent() {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: { queries: { staleTime: 30_000, refetchOnWindowFocus: false } },
  }));
  return (
    <QueryClientProvider client={queryClient}>
      <SidebarProvider>
        <div className="flex min-h-screen w-full bg-background">
          <AppSidebar />
          <div className="flex flex-1 flex-col">
            <PageHeader />
            <main className="flex-1 p-4 md:p-6">
              <Outlet />
            </main>
          </div>
        </div>
        <Toaster richColors position="top-right" />
      </SidebarProvider>
    </QueryClientProvider>
  );
}
