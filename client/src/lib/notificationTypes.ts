import type { BadgeTone } from "@/components/ui/Badge";
import {
  BellIcon,
  ClipboardCheckIcon,
  CalendarIcon,
  SwapIcon,
  BoxIcon,
  ClipboardListIcon,
} from "@/components/ui/icons";

export type NotificationType = "alert" | "approval" | "booking" | "transfer" | "allocation" | "audit";

export const NOTIFICATION_TYPE_TONE: Record<NotificationType, BadgeTone> = {
  alert: "danger",
  approval: "info",
  booking: "teal",
  transfer: "primary",
  allocation: "success",
  audit: "warning",
};

export const NOTIFICATION_TYPE_ICON: Record<NotificationType, typeof BellIcon> = {
  alert: BellIcon,
  approval: ClipboardCheckIcon,
  booking: CalendarIcon,
  transfer: SwapIcon,
  allocation: BoxIcon,
  audit: ClipboardListIcon,
};
