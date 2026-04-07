import React, { createContext, useContext, useState, useCallback } from "react";
import { Deal, ValidationLog, Alert, Settings, ValidationResult, DealStatus } from "@/types/deal";

const PARTNER_SITES = ["Amazon", "Flipkart", "Myntra", "Ajio", "Meesho"];

const mockDeals: Deal[] = [
  {
    id: "DEAL-001", partnerSite: "Amazon", productUrl: "https://amazon.in/dp/B09XYZ123",
    expectedPrice: 1499, couponCode: "FLASH20", cashbackPercent: 10, expectedFreebie: "Screen Guard",
    expiryDate: "2026-04-15", status: "Valid", lastCheckedTime: "2026-04-07T10:30:00",
    validationResult: { actualPrice: 1499, couponStatus: "Working", freebieStatus: "Available", stockStatus: "In Stock", finalResult: "Valid", reasons: [] },
    screenshotUrl: null,
  },
  {
    id: "DEAL-002", partnerSite: "Flipkart", productUrl: "https://flipkart.com/item/ABC456",
    expectedPrice: 899, couponCode: "SAVE15", cashbackPercent: 5, expectedFreebie: "",
    expiryDate: "2026-04-10", status: "Invalid", lastCheckedTime: "2026-04-07T09:15:00",
    validationResult: { actualPrice: 1099, couponStatus: "Failed", freebieStatus: "Not Available", stockStatus: "In Stock", finalResult: "Invalid", reasons: ["Price mismatch: ₹1099 vs ₹899", "Coupon SAVE15 not applicable"] },
    screenshotUrl: null,
  },
  {
    id: "DEAL-003", partnerSite: "Myntra", productUrl: "https://myntra.com/product/789",
    expectedPrice: 2499, couponCode: "", cashbackPercent: 8, expectedFreebie: "",
    expiryDate: "2026-04-20", status: "Pending", lastCheckedTime: null,
    validationResult: null, screenshotUrl: null,
  },
  {
    id: "DEAL-004", partnerSite: "Amazon", productUrl: "https://amazon.in/dp/B09QWE456",
    expectedPrice: 3999, couponCode: "MEGA30", cashbackPercent: 12, expectedFreebie: "Carry Case",
    expiryDate: "2026-04-12", status: "Valid", lastCheckedTime: "2026-04-06T14:00:00",
    validationResult: { actualPrice: 3999, couponStatus: "Working", freebieStatus: "Available", stockStatus: "In Stock", finalResult: "Valid", reasons: [] },
    screenshotUrl: null,
  },
  {
    id: "DEAL-005", partnerSite: "Ajio", productUrl: "https://ajio.com/p/12345",
    expectedPrice: 599, couponCode: "NEW10", cashbackPercent: 3, expectedFreebie: "",
    expiryDate: "2026-04-08", status: "Pending", lastCheckedTime: null,
    validationResult: null, screenshotUrl: null,
  },
];

const mockLogs: ValidationLog[] = [
  { id: "LOG-001", dealId: "DEAL-001", dateTime: "2026-04-07T10:30:00", actualPrice: 1499, couponStatus: "Working", result: "Valid", reasonSummary: "All checks passed" },
  { id: "LOG-002", dealId: "DEAL-002", dateTime: "2026-04-07T09:15:00", actualPrice: 1099, couponStatus: "Failed", result: "Invalid", reasonSummary: "Price mismatch, Coupon failed" },
  { id: "LOG-003", dealId: "DEAL-001", dateTime: "2026-04-06T10:30:00", actualPrice: 1499, couponStatus: "Working", result: "Valid", reasonSummary: "All checks passed" },
];

const mockAlerts: Alert[] = [
  { id: "ALT-001", dealId: "DEAL-002", issueType: "Price Mismatch", description: "Expected ₹899 but found ₹1099", timeDetected: "2026-04-07T09:15:00", priority: "High", resolved: false },
  { id: "ALT-002", dealId: "DEAL-002", issueType: "Coupon Failed", description: "Coupon SAVE15 is not applicable on this product", timeDetected: "2026-04-07T09:15:00", priority: "Medium", resolved: false },
];

const defaultSettings: Settings = {
  priceTolerance: 50, validationFrequency: "30 min", retryAttempts: 3,
  enableCouponValidation: true, emailAlerts: true, slackAlerts: false,
};

interface DealContextType {
  deals: Deal[];
  logs: ValidationLog[];
  alerts: Alert[];
  settings: Settings;
  partnerSites: string[];
  addDeal: (deal: Omit<Deal, "id" | "status" | "lastCheckedTime" | "validationResult" | "screenshotUrl">) => Deal;
  validateDeal: (dealId: string) => void;
  validateAllDeals: () => void;
  toggleAlertResolved: (alertId: string) => void;
  updateSettings: (s: Settings) => void;
  getDeal: (id: string) => Deal | undefined;
}

const DealContext = createContext<DealContextType | null>(null);

export const useDealContext = () => {
  const ctx = useContext(DealContext);
  if (!ctx) throw new Error("useDealContext must be used within DealProvider");
  return ctx;
};

function simulateValidation(deal: Deal): ValidationResult {
  const rand = Math.random();
  if (rand > 0.4) {
    return { actualPrice: deal.expectedPrice, couponStatus: deal.couponCode ? "Working" : "Not Applied", freebieStatus: deal.expectedFreebie ? "Available" : "Not Available", stockStatus: "In Stock", finalResult: "Valid", reasons: [] };
  }
  const reasons: string[] = [];
  const priceDiff = Math.floor(Math.random() * 500) + 100;
  const actualPrice = deal.expectedPrice + priceDiff;
  reasons.push(`Price mismatch: ₹${actualPrice} vs ₹${deal.expectedPrice}`);
  const couponStatus = deal.couponCode ? "Failed" as const : "Not Applied" as const;
  if (couponStatus === "Failed") reasons.push(`Coupon ${deal.couponCode} not applicable`);
  const freebieStatus = deal.expectedFreebie ? "Not Available" as const : "Not Available" as const;
  if (deal.expectedFreebie) reasons.push(`Freebie "${deal.expectedFreebie}" not available`);
  return { actualPrice, couponStatus, freebieStatus, stockStatus: rand > 0.2 ? "In Stock" : "Out of Stock", finalResult: "Invalid", reasons };
}

export const DealProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [deals, setDeals] = useState<Deal[]>(mockDeals);
  const [logs, setLogs] = useState<ValidationLog[]>(mockLogs);
  const [alerts, setAlerts] = useState<Alert[]>(mockAlerts);
  const [settings, setSettings] = useState<Settings>(defaultSettings);
  const [nextId, setNextId] = useState(6);

  const addDeal = useCallback((data: Omit<Deal, "id" | "status" | "lastCheckedTime" | "validationResult" | "screenshotUrl">) => {
    const deal: Deal = { ...data, id: `DEAL-${String(nextId).padStart(3, "0")}`, status: "Pending", lastCheckedTime: null, validationResult: null, screenshotUrl: null };
    setDeals(prev => [...prev, deal]);
    setNextId(n => n + 1);
    return deal;
  }, [nextId]);

  const validateDeal = useCallback((dealId: string) => {
    setDeals(prev => prev.map(d => {
      if (d.id !== dealId) return d;
      const result = simulateValidation(d);
      const now = new Date().toISOString();
      const log: ValidationLog = { id: `LOG-${Date.now()}`, dealId, dateTime: now, actualPrice: result.actualPrice, couponStatus: result.couponStatus, result: result.finalResult, reasonSummary: result.reasons.length ? result.reasons.join(", ") : "All checks passed" };
      setLogs(prev => [log, ...prev]);
      if (result.finalResult === "Invalid") {
        const newAlerts: Alert[] = result.reasons.map((r, i) => ({
          id: `ALT-${Date.now()}-${i}`, dealId, issueType: r.includes("Price") ? "Price Mismatch" as const : r.includes("Coupon") ? "Coupon Failed" as const : "Freebie Missing" as const,
          description: r, timeDetected: now, priority: r.includes("Price") ? "High" as const : "Medium" as const, resolved: false,
        }));
        setAlerts(prev => [...newAlerts, ...prev]);
      }
      return { ...d, status: result.finalResult as DealStatus, lastCheckedTime: now, validationResult: result };
    }));
  }, []);

  const validateAllDeals = useCallback(() => {
    deals.forEach(d => validateDeal(d.id));
  }, [deals, validateDeal]);

  const toggleAlertResolved = useCallback((alertId: string) => {
    setAlerts(prev => prev.map(a => a.id === alertId ? { ...a, resolved: !a.resolved } : a));
  }, []);

  const getDeal = useCallback((id: string) => deals.find(d => d.id === id), [deals]);

  return (
    <DealContext.Provider value={{ deals, logs, alerts, settings, partnerSites: PARTNER_SITES, addDeal, validateDeal, validateAllDeals, toggleAlertResolved, updateSettings: setSettings, getDeal }}>
      {children}
    </DealContext.Provider>
  );
};
