export type Role = "employee" | "admin";

export interface User {
  userId: string;
  name: string;
  email: string;
  role: Role;
}

export interface Department {
  deptId: string;
  name: string;
  head?: string;
  parentDeptId?: string | null;
  status: "active" | "inactive";
}

export interface Category {
  id: string;
  name: string;
}

export interface Employee {
  id: string;
  name: string;
  email: string;
  deptId?: string;
  title?: string;
}

export type AssetStatus = "Available" | "Allocated" | "Maintenance" | "Retired";

export interface Asset {
  tag: string;
  name: string;
  category: string;
  status: AssetStatus;
  location: string;
  departmentId?: string;
}

export interface Allocation {
  tag: string;
  currentHolder: string;
  allocatedSince: string;
  departmentId?: string;
}

export type TransferStatus = "pending_approval" | "approved" | "rejected";

export interface TransferRequest {
  requestId: string;
  tag: string;
  fromEmployeeId: string;
  toEmployeeId: string;
  reason: string;
  status: TransferStatus;
}

export interface Resource {
  resourceId: string;
  name: string;
  type: string;
}

export type BookingStatus = "confirmed" | "cancelled";

export interface Booking {
  bookingId: string;
  resourceId: string;
  date: string;
  startTime: string;
  endTime: string;
  status: BookingStatus;
}

export type TicketStatus =
  | "pending"
  | "approved"
  | "technician_assigned"
  | "in_progress"
  | "resolved";

export interface MaintenanceTicket {
  ticketId: string;
  tag: string;
  issueDescription: string;
  status: TicketStatus;
  technicianName?: string;
}

export type VerificationResult = "verified" | "missing" | "damaged";

export interface AuditLineItem {
  tag: string;
  expectedLocation: string;
  verification?: VerificationResult;
  notes?: string;
}

export interface AuditCycle {
  auditId: string;
  department: string;
  dateRangeStart: string;
  dateRangeEnd: string;
  auditors: string[];
  status: "open" | "closed";
  lineItems: AuditLineItem[];
}

export interface NotificationEvent {
  eventId: string;
  type: string;
  message: string;
  timestamp: string;
  relatedEntityTag?: string;
}
