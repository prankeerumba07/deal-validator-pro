import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { DealProvider } from "@/context/DealContext";
import Layout from "@/components/Layout";
import Index from "./pages/Index";
import AddDeal from "./pages/AddDeal";
import DealDetails from "./pages/DealDetails";
import ValidationLogs from "./pages/ValidationLogs";
import Alerts from "./pages/Alerts";
import SettingsPage from "./pages/SettingsPage";
import AutoValidate from "./pages/AutoValidate";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <DealProvider>
          <Layout>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/add-deal" element={<AddDeal />} />
              <Route path="/deal/:id" element={<DealDetails />} />
              <Route path="/logs" element={<ValidationLogs />} />
              <Route path="/alerts" element={<Alerts />} />
              <Route path="/settings" element={<SettingsPage />} />
              <Route path="/auto-validate" element={<AutoValidate />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Layout>
        </DealProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
