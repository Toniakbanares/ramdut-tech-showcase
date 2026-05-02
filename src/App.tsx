import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import Lab from "./pages/Lab";
import SharePage from "./pages/SharePage";
import ApiStatus from "./pages/ApiStatus";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />

          {/* RAMU Lab V3 — canvas único, rotas SEO-friendly */}
          <Route path="/lab" element={<Lab metaKey="default" />} />
          <Route path="/lab/imagens" element={<Lab metaKey="imagens" initialMode="image" />} />
          <Route path="/lab/svg" element={<Lab metaKey="svg" initialMode="svg" />} />
          <Route path="/lab/pro-fal" element={<Lab metaKey="pro-fal" initialMode="pro-fal" />} />
          <Route path="/lab/chat" element={<Lab metaKey="chat" initialMode="chat" />} />
          <Route path="/lab/share/:id" element={<SharePage />} />

          {/* Rota antiga continua apontando pro novo Lab */}
          <Route path="/ai-tools" element={<Lab metaKey="default" />} />

          <Route path="/api-status" element={<ApiStatus />} />

          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
