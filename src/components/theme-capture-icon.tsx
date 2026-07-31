import Image from "next/image";
import { Icon } from "@/components/icon";
import type { ThemeId } from "@/lib/theme";

type ThemeCaptureIconProps = {
  theme: ThemeId;
  className?: string;
};

export function ThemeCaptureIcon({ theme, className = "h-7 w-7" }: ThemeCaptureIconProps) {
  if (theme === "default") return <Icon name="capture" className={className} />;

  if (theme === "hollow-knight") {
    return (
      <Image
        src="/theme-icons/hollow-knight.png"
        alt=""
        aria-hidden="true"
        width={256}
        height={256}
        className={`${className} object-contain`}
      />
    );
  }

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

  switch (theme) {
    case "pokemon":
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="9" />
          <path d="M3.4 10h5.1a4 4 0 0 1 7 0h5.1M3.4 14h5.1a4 4 0 0 0 7 0h5.1" />
          <circle cx="12" cy="12" r="2.25" />
        </svg>
      );
    case "hades":
      return (
        <svg {...common}>
          <path d="M7.2 8.5C7.8 5.8 9.5 4 12 4s4.2 1.8 4.8 4.5c1.6.9 2.7 2.6 2.7 4.5 0 2.5-1.8 4.6-4.2 5.1V21l-3.3-2-3.3 2v-2.9A5.2 5.2 0 0 1 4.5 13c0-1.9 1.1-3.6 2.7-4.5Z" />
          <path d="M8.8 12.5h.1M15.1 12.5h.1M10 16h4M8 6 6.5 3.5M16 6l1.5-2.5" />
        </svg>
      );
    case "hades-ii":
      return (
        <svg {...common}>
          <path d="M14.8 4.3A7.4 7.4 0 1 0 19.7 15 6.2 6.2 0 1 1 14.8 4.3Z" />
          <path d="M12 8v8M9.5 10.5h5M10 18.5l2-2 2 2" />
        </svg>
      );
    case "silksong":
      return (
        <svg {...common}>
          <path d="M8 8 4.5 3M16 8 19.5 3M8 8c-1.7 1.4-2.7 3.4-2.7 5.7C5.3 18 8.2 21 12 21s6.7-3 6.7-7.3c0-2.3-1-4.3-2.7-5.7" />
          <path d="M9.2 13h.1M14.7 13h.1M12 16v5M10 18h4" />
        </svg>
      );
    case "elden-ring":
      return (
        <svg {...common}>
          <circle cx="12" cy="9" r="5" />
          <circle cx="9" cy="13" r="5" />
          <circle cx="15" cy="13" r="5" />
          <path d="M12 2v20M7 20h10" />
        </svg>
      );
    case "cyberpunk-2077":
      return (
        <svg {...common}>
          <path d="M6 5h11l-4 5h5l-8 9 2-6H6l4-5H6Z" />
          <path d="M4 4v16M20 4v16" />
        </svg>
      );
    case "the-witcher-3":
      return (
        <svg {...common}>
          <path d="m4 5 5 3 3-4 3 4 5-3-2 8-6 7-6-7Z" />
          <path d="m8.5 12 3.5 2 3.5-2M9 9l3 2 3-2M10 16l2 2 2-2" />
        </svg>
      );
    case "stardew-valley":
      return (
        <svg {...common}>
          <path d="M12 21V9" />
          <path d="M12 13C8 13 5 10.8 5 7c4 0 7 2.2 7 6ZM12 10c0-4 2.8-7 7-7 0 4.2-2.8 7-7 7Z" />
          <path d="M8 21h8" />
        </svg>
      );
  }
}
