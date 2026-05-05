export type UserRole = 'Admin' | 'Vendor' | 'Customer';
export type InvoiceStatus = 'Paid' | 'Pending' | 'Overdue';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatar?: string;
  vendorId?: string;
  customerId?: string;
  permissions: string[];
}

export interface InvoiceItem {
  description: string;
  quantity: number;
  unitPrice: number;
  taxRate: number;
  total: number;
}

export interface Invoice {
  id: string;
  vendorId: string;
  customerId: string;
  customerName: string;
  date: string;
  dueDate: string;
  status: InvoiceStatus;
  currency: string;
  items: InvoiceItem[];
  subtotal: number;
  taxTotal: number;
  grandTotal: number;
}

export interface ReportFilters {
  status: InvoiceStatus | 'All';
  fromDate: string;
  toDate: string;
  clientOrVendor: string;
}
