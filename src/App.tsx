import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import Lab from "./pages/Lab";
import Imagine from "./pages/Imagine";
import SharePage from "./pages/SharePage";
import ApiStatus from "./pages/ApiStatus";
import RamonChat from "./pages/RamonChat";
import Chat from "./pages/Chat";
import Studio from "./pages/Studio";
import ErrorBoundary from "./components/ErrorBoundary";

import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <ErrorBoundary area="app">
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/chat" element={<ErrorBoundary area="chat"><Chat /></ErrorBoundary>} />
          <Route path="/imagine" element={<ErrorBoundary area="imagine"><Imagine /></ErrorBoundary>} />
          <Route path="/studio" element={<ErrorBoundary area="studio"><Studio /></ErrorBoundary>} />



          {/* RAMU Lab V3 — canvas único, rotas SEO-friendly */}
          <Route path="/lab" element={<ErrorBoundary area="lab"><Lab metaKey="default" /></ErrorBoundary>} />
          <Route path="/lab/imagens" element={<ErrorBoundary area="lab"><Lab metaKey="imagens" initialMode="image" /></ErrorBoundary>} />
          <Route path="/lab/svg" element={<ErrorBoundary area="lab"><Lab metaKey="svg" initialMode="svg" /></ErrorBoundary>} />
          <Route path="/lab/pro-fal" element={<ErrorBoundary area="lab"><Lab metaKey="pro-fal" initialMode="pro-fal" /></ErrorBoundary>} />
          <Route path="/lab/chat" element={<ErrorBoundary area="lab"><Lab metaKey="chat" initialMode="chat" /></ErrorBoundary>} />
          <Route path="/lab/ramon" element={<ErrorBoundary area="ramon"><RamonChat /></ErrorBoundary>} />
          <Route path="/lab/ramon/:threadId" element={<ErrorBoundary area="ramon"><RamonChat /></ErrorBoundary>} />
          <Route path="/lab/share/:id" element={<SharePage />} />

          {/* Rota antiga continua apontando pro novo Lab */}
          <Route path="/ai-tools" element={<ErrorBoundary area="lab"><Lab metaKey="default" /></ErrorBoundary>} />

          <Route path="/api-status" element={<ApiStatus />} />

          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
        </ErrorBoundary>

      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
