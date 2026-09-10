// Lightweight inline SVG icon set (no external dependency).
import React from "react";

function Svg({ children, size = 18, ...props }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      {children}
    </svg>
  );
}

export const IconHome = (p) => (
  <Svg {...p}><path d="M3 10.5 12 3l9 7.5" /><path d="M5 9.5V21h5v-6h4v6h5V9.5" /></Svg>
);
export const IconJournal = (p) => (
  <Svg {...p}><path d="M6 3h11a2 2 0 0 1 2 2v15H7a2 2 0 0 1-2-2V5a2 2 0 0 1 1-1.7Z" /><path d="M7 20a2 2 0 0 1 2 2v-9h10" /></Svg>
);
export const IconSparkle = (p) => (
  <Svg {...p}><path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3Z" /><path d="M19 15l.7 2L22 17.7 19.7 18.3 19 20l-.7-1.7L16 17.7 18.3 17l.7-2Z" /></Svg>
);
export const IconSettings = (p) => (
  <Svg {...p}><path d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" /><path d="M19.4 15a1.7 1.7 0 0 0 .34 1.87l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.7 1.7 0 0 0-1.87-.34 1.7 1.7 0 0 0-1 1.55V21a2 2 0 1 1-4 0v-.09a1.7 1.7 0 0 0-1.11-1.55 1.7 1.7 0 0 0-1.87.34l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.7 1.7 0 0 0 .34-1.87 1.7 1.7 0 0 0-1.55-1H3a2 2 0 1 1 0-4h.09a1.7 1.7 0 0 0 1.55-1.11 1.7 1.7 0 0 0-.34-1.87l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.7 1.7 0 0 0 1.87.34h.01a1.7 1.7 0 0 0 1-1.55V3a2 2 0 1 1 4 0v.09a1.7 1.7 0 0 0 1 1.55 1.7 1.7 0 0 0 1.87-.34l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.7 1.7 0 0 0-.34 1.87v.01a1.7 1.7 0 0 0 1.55 1H21a2 2 0 1 1 0 4h-.09a1.7 1.7 0 0 0-1.51 1Z" /></Svg>
);
export const IconPlus = (p) => (
  <Svg {...p}><path d="M12 5v14M5 12h14" /></Svg>
);
export const IconEdit = (p) => (
  <Svg {...p}><path d="M12 20h9" /><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5Z" /></Svg>
);
export const IconTrash = (p) => (
  <Svg {...p}><path d="M3 6h18" /><path d="M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2" /><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" /><path d="M10 11v6M14 11v6" /></Svg>
);
export const IconSearch = (p) => (
  <Svg {...p}><circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3" /></Svg>
);
export const IconX = (p) => (
  <Svg {...p}><path d="M18 6 6 18M6 6l12 12" /></Svg>
);
export const IconChevDown = (p) => (
  <Svg {...p}><path d="m6 9 6 6 6-6" /></Svg>
);
export const IconLogout = (p) => (
  <Svg {...p}><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><path d="m16 17 5-5-5-5" /><path d="M21 12H9" /></Svg>
);
export const IconCalendar = (p) => (
  <Svg {...p}><rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" /></Svg>
);
export const IconTrend = (p) => (
  <Svg {...p}><path d="M22 7 13.5 15.5 8.5 10.5 2 17" /><path d="M16 7h6v6" /></Svg>
);
export const IconMenu = (p) => (
  <Svg {...p}><path d="M4 6h16M4 12h16M4 18h16" /></Svg>
);
export const IconCheck = (p) => (
  <Svg {...p}><path d="M20 6 9 17l-5-5" /></Svg>
);
export const IconEllipsis = (p) => (
  <Svg {...p}><circle cx="12" cy="5" r="1.4" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="1.4" fill="currentColor" stroke="none"/><circle cx="12" cy="19" r="1.4" fill="currentColor" stroke="none"/></Svg>
);
export const IconBrain = (p) => (
  <Svg {...p}><path d="M9.5 2a2.5 2.5 0 0 0-2.4 3.2A2.5 2.5 0 0 0 5 7.5c-.3 1.2.3 2.4 1.4 3-.6 1-.3 2.2.7 2.7.4 1.8 2 3 3.9 2.8V2.5A2.5 2.5 0 0 0 9.5 2Z" /><path d="M14.5 2A2.5 2.5 0 0 1 16.9 5.2a2.5 2.5 0 0 1 2.1 1.7c.3 1.1-.3 2.3-1.3 2.9.5 1 .2 2.2-.7 2.7a3.5 3.5 0 0 1-3.5 3V2.5" /></Svg>
);
export const IconArrowR = (p) => (
  <Svg {...p}><path d="M5 12h14M13 6l6 6-6 6" /></Svg>
);
export const IconClock = (p) => (
  <Svg {...p}><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></Svg>
);
export const IconAlert = (p) => (
  <Svg {...p}><path d="M12 9v4M12 17h.01"/><path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z"/></Svg>
);
export const IconInfo = (p) => (
  <Svg {...p}><circle cx="12" cy="12" r="9"/><path d="M12 16v-5M12 8h.01"/></Svg>
);
export const IconHeart = (p) => (
  <Svg {...p}><path d="M19 14c1.5-1.5 2-3 2-4.5A4.5 4.5 0 0 0 12 6a4.5 4.5 0 0 0-9 3.5C3 11 3.5 12.5 5 14l7 7 7-7Z"/></Svg>
);
export const IconRefresh = (p) => (
  <Svg {...p}><path d="M21 12a9 9 0 1 1-2.6-6.4"/><path d="M21 3v6h-6"/></Svg>
);
export const IconShield = (p) => (
  <Svg {...p}><path d="M12 22s8-3.5 8-10V5l-8-3-8 3v7c0 6.5 8 10 8 10Z"/><path d="m9 12 2 2 4-4"/></Svg>
);
export const IconPen = (p) => (
  <Svg {...p}><path d="m12 19 7-7 3 3-7 7-3-3Z"/><path d="m18 13-1.5-7.5L2 2l3.5 14.5L13 18l5-5Z"/><path d="m2 2 7.6 7.6"/><circle cx="11" cy="11" r="2"/></Svg>
);

// Feather / journal brand mark
export function FeatherMark({ size = 22 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M20.24 12.24a6 6 0 0 0-8.49-8.49L5 10.5V19h8.5l6.74-6.76Z" />
      <path d="M16 8 2 22" />
      <path d="M17.5 15H9" />
    </svg>
  );
}
