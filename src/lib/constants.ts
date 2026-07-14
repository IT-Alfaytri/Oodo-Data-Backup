export const PAGE_SIZE = 50;

export const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  draft: { bg: "bg-yellow-100", text: "text-yellow-800" },
  posted: { bg: "bg-green-100", text: "text-green-800" },
  sale: { bg: "bg-green-100", text: "text-green-800" },
  purchase: { bg: "bg-green-100", text: "text-green-800" },
  done: { bg: "bg-blue-100", text: "text-blue-800" },
  cancel: { bg: "bg-red-100", text: "text-red-800" },
  paid: { bg: "bg-green-100", text: "text-green-800" },
  not_paid: { bg: "bg-orange-100", text: "text-orange-800" },
  partial: { bg: "bg-yellow-100", text: "text-yellow-800" },
  assigned: { bg: "bg-blue-100", text: "text-blue-800" },
  confirmed: { bg: "bg-indigo-100", text: "text-indigo-800" },
  waiting: { bg: "bg-purple-100", text: "text-purple-800" },
};

export const NAV_ITEMS = [
  { label: "Dashboard", href: "/", icon: "LayoutDashboard" },
  { label: "Sales Orders", href: "/sales", icon: "ShoppingCart" },
  { label: "Purchase Orders", href: "/purchases", icon: "Truck" },
  { label: "Products", href: "/products", icon: "Package" },
  { label: "Customers", href: "/customers", icon: "Users" },
  { label: "Suppliers", href: "/suppliers", icon: "Factory" },
  { label: "Accounting", href: "/accounting", icon: "Calculator" },
  { label: "Customer Invoices", href: "/invoices/customer", icon: "FileText" },
  { label: "Vendor Bills", href: "/invoices/vendor", icon: "Receipt" },
  { label: "Credit Notes", href: "/invoices/credit-notes", icon: "FileX" },
  { label: "Inventory", href: "/inventory", icon: "Warehouse" },
  { label: "Stock Movements", href: "/stock-movements", icon: "ArrowLeftRight" },
  { label: "Costing", href: "/costing", icon: "DollarSign" },
  { label: "Employees", href: "/employees", icon: "Briefcase" },
  { label: "Reports", href: "/reports", icon: "BarChart3" },
] as const;

export function formatAmount(amount: number | null | undefined): string {
  if (amount == null) return "—";
  return new Intl.NumberFormat("en-QA", {
    style: "currency",
    currency: "QAR",
    minimumFractionDigits: 2,
  }).format(amount);
}

export function formatDate(date: string | null | undefined): string {
  if (!date) return "—";
  return new Date(date).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}
