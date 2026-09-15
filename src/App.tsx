import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Route, Routes, useLocation } from "react-router-dom";
import { Suspense, lazy } from "react";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { CountryProvider } from "@/context/CountryContext";
import AdminGate from "@/components/AdminGate";
import { CountryDrilldownGate } from "@/layouts/CountryDrilldown/CountryDrilldownGate";
import { legalHubConfig } from "@/layouts/CountryDrilldown/configs/legal-hub.config";
import { LegalHubShell } from "@/components/layout/LegalHubShell";
import { ROOT } from "@/layouts/legalHubNav";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

// Um separador aberto antes de um redeploy falha a carregar o chunk: tentamos outra vez (ver main.tsx).
const L = (f: () => Promise<{ default: React.ComponentType }>) =>
  lazy(() => f().catch(() => new Promise<{ default: React.ComponentType }>((r) => setTimeout(() => r(f()), 1000))));

const Overview = L(() => import("./pages/legal-hub/OverviewPage"));
const Obligations = L(() => import("./pages/legal-hub/ObligationsPage"));
const Countries = L(() => import("./pages/legal-hub/CountriesPage"));
const Verticals = L(() => import("./pages/legal-hub/VerticalsPage"));
const Privacy = L(() => import("./pages/legal-hub/PrivacyPage"));
const Restrictions = L(() => import("./pages/legal-hub/RestrictionsPage"));
const Pages = L(() => import("./pages/legal-hub/PagesPage"));
const Sources = L(() => import("./pages/legal-hub/SourcesPage"));

const Fallback = () => <div className="p-8 text-center text-sm text-slate-700">Chargement…</div>;

/** Rotas antigas /legal-hub/* → /cpanel/legal-hub/* (mantém o resto do caminho). */
const LegacyRedirect = () => {
  const { pathname, search, hash } = useLocation();
  const rest = pathname.replace(/^\/legal-hub/, "");
  return <Navigate to={`${ROOT}${rest}${search}${hash}`} replace />;
};

// Pré-requis universels — l'ordre compte pour le runner : login (AdminGate) → porte de pays
// (CountryDrilldownGate, contrat v_geo_country_door) → module. Le Validation Mode et l'agent
// vivent dans le shell.
const Gated = () => (
  <AdminGate>
    <CountryDrilldownGate config={legalHubConfig}>
      <Suspense fallback={<Fallback />}>
        <Routes>
          <Route path={ROOT} element={<LegalHubShell />}>
            <Route index element={<Overview />} />
            <Route path="obligations" element={<Obligations />} />
            <Route path="pays" element={<Countries />} />
            <Route path="verticales" element={<Verticals />} />
            <Route path="confidentialite" element={<Privacy />} />
            <Route path="restrictions" element={<Restrictions />} />
            <Route path="pages" element={<Pages />} />
            <Route path="sources" element={<Sources />} />
          </Route>
          <Route path="/" element={<Navigate to={ROOT} replace />} />
          <Route path="/admin/login" element={<Navigate to={ROOT} replace />} />
          <Route path="/legal-hub/*" element={<LegacyRedirect />} />
          <Route path="/legal-hub" element={<Navigate to={ROOT} replace />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
    </CountryDrilldownGate>
  </AdminGate>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <CountryProvider>
          <Gated />
        </CountryProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
