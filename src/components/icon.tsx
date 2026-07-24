import type { IconName } from "@/lib/navigation";

type IconProps = {
  name: IconName;
  className?: string;
};

export function Icon({ name, className = "h-5 w-5" }: IconProps) {
  const common = {
    className,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
  };

  switch (name) {
    case "capture":
      return <svg {...common}><path d="M12 5v14M5 12h14" /></svg>;
    case "inbox":
      return <svg {...common}><path d="M4 4h16l2 10v5a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1v-5L4 4Z" /><path d="M2 14h5l2 3h6l2-3h5" /></svg>;
    case "projects":
      return <svg {...common}><rect x="3" y="4" width="8" height="7" rx="2" /><rect x="13" y="4" width="8" height="7" rx="2" /><rect x="3" y="13" width="8" height="7" rx="2" /><path d="M13 16.5h8M17 13v7" /></svg>;
    case "tasks":
      return <svg {...common}><rect x="4" y="3" width="16" height="18" rx="2" /><path d="m8 8 1.5 1.5L12 7M14 9h3M8 14l1.5 1.5L12 13M14 15h3" /></svg>;
    case "thoughts":
      return <svg {...common}><path d="M9 18h6M10 22h4" /><path d="M8.2 15.5A7 7 0 1 1 15.8 15.5C14.7 16.3 14 17.1 14 18h-4c0-.9-.7-1.7-1.8-2.5Z" /></svg>;
    case "review":
      return <svg {...common}><path d="M5 3h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z" /><path d="M8 8h8M8 12h8M8 16h5" /></svg>;
    case "spaces":
      return <svg {...common}><rect x="4" y="4" width="6" height="6" rx="1.5" /><rect x="14" y="4" width="6" height="6" rx="1.5" /><rect x="4" y="14" width="6" height="6" rx="1.5" /><rect x="14" y="14" width="6" height="6" rx="1.5" /></svg>;
    case "archive":
      return <svg {...common}><path d="M4 7h16v13H4z" /><path d="M3 4h18v3H3zM9 11h6" /></svg>;
    case "library":
      return <svg {...common}><path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H11v17H6.5A2.5 2.5 0 0 0 4 22V5.5Z" /><path d="M20 5.5A2.5 2.5 0 0 0 17.5 3H13v17h4.5A2.5 2.5 0 0 1 20 22V5.5Z" /></svg>;
    case "trips":
      return <svg {...common}><path d="m3 11 18-7-7 18-3-8-8-3Z" /><path d="m11 14 4-4" /></svg>;
    case "fitness":
      return <svg {...common}><path d="M6 8v8M18 8v8M3 10v4M21 10v4M6 12h12" /></svg>;
    case "habits":
      return <svg {...common}><path d="M20 6 9 17l-5-5" /><path d="M4 5h10M4 19h16" /></svg>;
    case "settings":
      return <svg {...common}><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-2.8 2.8-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.6v.2h-4V21a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1L4.2 17l.1-.1a1.7 1.7 0 0 0 .3-1.9A1.7 1.7 0 0 0 3 14H2.8v-4H3a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9l-.1-.1L7 4.2l.1.1A1.7 1.7 0 0 0 9 4.6a1.7 1.7 0 0 0 1-1.6v-.2h4V3a1.7 1.7 0 0 0 1 1.6 1.7 1.7 0 0 0 1.9-.3l.1-.1L19.8 7l-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.6 1h.2v4H21a1.7 1.7 0 0 0-1.6 1Z" /></svg>;
  }
}
