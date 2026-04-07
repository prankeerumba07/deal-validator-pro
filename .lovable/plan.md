

# Flash Deal Validator Dashboard

## Overview
A comprehensive deal validation platform to manage, validate, and track flash deals across e-commerce partners like Amazon, Flipkart, and Myntra. All data will use local state with mock data initially (no backend).

## Pages & Features

### 1. Dashboard (Main Page)
- Data table with columns: Deal ID, Partner Site, Product URL (clickable), Expected Price, Coupon Code, Cashback %, Status, Last Checked Time
- Color-coded status badges: Green (Valid), Red (Invalid), Yellow (Pending)
- Top filters: Partner Site dropdown, Status dropdown, Search by Deal ID/URL
- "Add New Deal" button (top right) and "Validate All Deals" button
- Click a row to navigate to Deal Details

### 2. Add New Deal Form
- Fields: Partner Site (dropdown), Product URL, Expected Price, Coupon Code (optional), Expected Cashback %, Expected Freebie (optional), Deal Expiry Date (date picker)
- "Save Deal" and "Save & Validate" buttons
- Validation: URL required, price > 0
- Redirects to Dashboard on save

### 3. Deal Details + Validation Screen
- Deal info card at top with all deal fields
- "Validation Results" section: Actual Price, Coupon Status, Freebie Status, Stock Status, Final Result
- Failure reasons as bullet points when invalid
- "Validate Again" and "View Screenshot" buttons
- Green/red color indicators

### 4. Validation Logs
- Table: Deal ID, Date/Time, Actual Price, Coupon Status, Result, Reason Summary
- Filters: date range, status, partner site
- Sorted latest first, clickable rows

### 5. Alerts & Notifications
- Alert list: Deal ID, Issue Type, Description, Time Detected
- Priority badges: High (red), Medium (orange), Low (yellow)
- Filters by priority and partner site
- "Mark as Resolved" toggle

### 6. Settings
- Price Tolerance (₹), Validation Frequency dropdown, Retry Attempts
- Toggles: Enable Coupon Validation, Email Alerts, Slack Alerts
- Save Settings button

### 7. API Integration
- Mock `/validate-deal` POST logic that simulates validation responses
- Updates deal status, stores results, creates alerts for invalid deals

### 8. Sidebar Navigation
- Persistent sidebar with links to all pages
- Clean, modern design using shadcn/ui components throughout

All screens use mock/local data with React state and context. The validation API call will be simulated with realistic mock responses.

