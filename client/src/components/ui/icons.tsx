// Minimal hand-authored icon set (stroke-based, 24x24 viewBox) so the app has
// no external icon-library dependency.
import type { ReactNode } from "react";

type IconProps = { className?: string };

function base(paths: ReactNode) {
  return function Icon({ className = "h-5 w-5" }: IconProps) {
    return (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.75}
        strokeLinecap="round"
        strokeLinejoin="round"
        className={className}
      >
        {paths}
      </svg>
    );
  };
}

export const GridIcon = base(
  <>
    <rect x="3" y="3" width="8" height="8" rx="1.5" />
    <rect x="13" y="3" width="8" height="8" rx="1.5" />
    <rect x="3" y="13" width="8" height="8" rx="1.5" />
    <rect x="13" y="13" width="8" height="8" rx="1.5" />
  </>,
);

export const BuildingIcon = base(
  <>
    <rect x="4" y="3" width="12" height="18" rx="1" />
    <path d="M16 8h4v13h-4M8 7h1M8 11h1M8 15h1M12 7h1M12 11h1M12 15h1" />
  </>,
);

export const BoxIcon = base(
  <>
    <path d="M3 8l9-5 9 5-9 5-9-5Z" />
    <path d="M3 8v8l9 5 9-5V8" />
    <path d="M12 13v8" />
  </>,
);

export const SwapIcon = base(
  <>
    <path d="M4 7h13l-3-3M20 17H7l3 3" />
  </>,
);

export const CalendarIcon = base(
  <>
    <rect x="3" y="5" width="18" height="16" rx="2" />
    <path d="M3 10h18M8 3v4M16 3v4" />
  </>,
);

export const WrenchIcon = base(
  <path d="M14.7 6.3a4 4 0 0 0-5.4 5.4L3 18v3h3l6.3-6.3a4 4 0 0 0 5.4-5.4l-2.8 2.8-2-2 2.8-2.8Z" />,
);

export const ClipboardCheckIcon = base(
  <>
    <rect x="5" y="4" width="14" height="17" rx="1.5" />
    <path d="M9 3.5h6a1 1 0 0 1 1 1V6H8V4.5a1 1 0 0 1 1-1Z" />
    <path d="m9 13 2 2 4-4" />
  </>,
);

export const BarChartIcon = base(
  <>
    <path d="M4 20V10M11 20V4M18 20v-7" />
    <path d="M2 20h20" />
  </>,
);

export const BellIcon = base(
  <>
    <path d="M6 9a6 6 0 0 1 12 0c0 4 1.5 5.5 2 6H4c.5-.5 2-2 2-6Z" />
    <path d="M10 19a2 2 0 0 0 4 0" />
  </>,
);

export const LogOutIcon = base(
  <>
    <path d="M9 21H5a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h4" />
    <path d="M16 17l5-5-5-5M21 12H9" />
  </>,
);

export const RefreshIcon = base(
  <>
    <path d="M3 12a9 9 0 0 1 15.5-6.2M21 12a9 9 0 0 1-15.5 6.2" />
    <path d="M18.5 3v3.3h-3.3M5.5 21v-3.3h3.3" />
  </>,
);

export const PlusIcon = base(<path d="M12 5v14M5 12h14" />);

export const SearchIcon = base(
  <>
    <circle cx="11" cy="11" r="7" />
    <path d="m21 21-4.3-4.3" />
  </>,
);

export const ChevronDownIcon = base(<path d="m6 9 6 6 6-6" />);

export const AlertTriangleIcon = base(
  <>
    <path d="M12 3 2 20h20L12 3Z" />
    <path d="M12 10v4M12 17h.01" />
  </>,
);

export const UsersIcon = base(
  <>
    <circle cx="9" cy="8" r="3.2" />
    <path d="M3.5 20a5.5 5.5 0 0 1 11 0" />
    <path d="M16 8.5a3 3 0 1 1 3.8 2.9" />
    <path d="M15.5 14.2c2.7.4 4.8 2.3 5 5.8" />
  </>,
);

export const TagIcon = base(
  <>
    <path d="M12.6 3H5a2 2 0 0 0-2 2v7.6a2 2 0 0 0 .6 1.4l8.4 8.4a2 2 0 0 0 2.8 0l7-7a2 2 0 0 0 0-2.8L13.4 3.6a2 2 0 0 0-1.4-.6Z" />
    <circle cx="8.5" cy="8.5" r="1.5" />
  </>,
);

export const XIcon = base(<path d="M18 6 6 18M6 6l12 12" />);

export const ClipboardListIcon = base(
  <>
    <rect x="5" y="4" width="14" height="17" rx="1.5" />
    <path d="M9 3.5h6a1 1 0 0 1 1 1V6H8V4.5a1 1 0 0 1 1-1Z" />
    <path d="M9 11h6M9 14.5h6M9 17.5h3" />
  </>,
);
