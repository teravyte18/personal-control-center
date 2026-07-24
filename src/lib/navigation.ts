export type IconName =
  | "capture"
  | "inbox"
  | "projects"
  | "tasks"
  | "thoughts"
  | "review"
  | "spaces"
  | "archive"
  | "library"
  | "trips"
  | "fitness"
  | "habits"
  | "settings";

export type Destination = {
  id: string;
  label: string;
  href: string;
  icon: IconName;
  description: string;
  available: boolean;
  pinnable: boolean;
};

export const destinations: Destination[] = [
  {
    id: "inbox",
    label: "Inbox",
    href: "/inbox",
    icon: "inbox",
    description: "Clarify and organise newly captured items.",
    available: true,
    pinnable: true,
  },
  {
    id: "projects",
    label: "Projects",
    href: "/projects",
    icon: "projects",
    description: "Track active outcomes and their current action points.",
    available: true,
    pinnable: true,
  },
  {
    id: "tasks",
    label: "Tasks",
    href: "/tasks",
    icon: "tasks",
    description: "Complete one-off actions that do not need a project timeline.",
    available: true,
    pinnable: true,
  },
  {
    id: "accomplishments",
    label: "Accomplishments",
    href: "/spaces/accomplishments",
    icon: "projects",
    description: "Browse completed projects and their action histories.",
    available: true,
    pinnable: false,
  },
  {
    id: "archive",
    label: "Archive",
    href: "/spaces/archive",
    icon: "archive",
    description: "Recover projects removed from active views.",
    available: true,
    pinnable: false,
  },
  {
    id: "thoughts",
    label: "Thoughts",
    href: "/thoughts",
    icon: "thoughts",
    description: "Keep observations and ideas that do not require action.",
    available: true,
    pinnable: true,
  },
  {
    id: "review",
    label: "Review",
    href: "/review",
    icon: "review",
    description: "Reflect on the previous Saturday-to-Friday period and browse completed reviews.",
    available: true,
    pinnable: true,
  },
  {
    id: "library",
    label: "Library",
    href: "/library",
    icon: "library",
    description: "Books, reading progress, notes, and recommendations.",
    available: false,
    pinnable: true,
  },
  {
    id: "trips",
    label: "Trips",
    href: "/trips",
    icon: "trips",
    description: "Travel ideas, plans, budgets, and price monitoring.",
    available: false,
    pinnable: true,
  },
  {
    id: "fitness",
    label: "Fitness",
    href: "/fitness",
    icon: "fitness",
    description: "Imported running activity and longer-term trends.",
    available: false,
    pinnable: true,
  },
  {
    id: "habits",
    label: "Habits",
    href: "/habits",
    icon: "habits",
    description: "Lightweight recurring practices and routines.",
    available: false,
    pinnable: true,
  },
  {
    id: "settings",
    label: "Settings",
    href: "/settings",
    icon: "settings",
    description: "App preferences, integrations, privacy, and data export.",
    available: false,
    pinnable: false,
  },
];

export const defaultPinnedDestinationIds = ["inbox", "projects", "tasks", "review"] as const;

export const defaultPinnedDestinations = defaultPinnedDestinationIds.map((id) => {
  const destination = destinations.find((item) => item.id === id);
  if (!destination) throw new Error(`Missing default destination: ${id}`);
  return destination;
});

export function isDestinationActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
}
