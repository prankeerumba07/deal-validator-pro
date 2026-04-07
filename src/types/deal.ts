export type DealStatus = "Valid" | "Invalid" | "Pending";
export type CouponStatus = "Working" | "Failed" | "Not Applied";
export type FreebieStatus = "Available" | "Not Available";
export type StockStatus = "In Stock" | "Out of Stock";
export type AlertPriority = "High" | "Medium" | "Low";
export type IssueType = "Price Mismatch" | "Coupon Failed" | "Freebie Missing";

export interface Deal {
  id: string;
  partnerSite: string;
  productUrl: string;
  expectedPrice: number;
  couponCode: string;
  cashbackPercent: number;
  expectedFreebie: string;
  expiryDate: string;
  status: DealStatus;
  lastCheckedTime: string | null;
  validationResult: ValidationResult | null;
  screenshotUrl: string | null;
}

export interface ValidationResult {
  actualPrice: number;
  couponStatus: CouponStatus;
  freebieStatus: FreebieStatus;
  stockStatus: StockStatus;
  finalResult: DealStatus;
  reasons: string[];
}

export interface ValidationLog {
  id: string;
  dealId: string;
  dateTime: string;
  actualPrice: number;
  couponStatus: CouponStatus;
  result: DealStatus;
  reasonSummary: string;
}

export interface Alert {
  id: string;
  dealId: string;
  issueType: IssueType;
  description: string;
  timeDetected: string;
  priority: AlertPriority;
  resolved: boolean;
}

export interface Settings {
  priceTolerance: number;
  validationFrequency: string;
  retryAttempts: number;
  enableCouponValidation: boolean;
  emailAlerts: boolean;
  slackAlerts: boolean;
}
