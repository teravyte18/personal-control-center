import { Icon } from "@/components/icon";
import type { ThemeId } from "@/lib/theme";

type ThemeCaptureIconProps = {
  theme: ThemeId;
  className?: string;
};

const themeSpritePositions: Partial<Record<ThemeId, string>> = {
  hades: "50% 0%",
  "hades-ii": "100% 0%",
  "hollow-knight": "0% 50%",
  silksong: "50% 50%",
  "elden-ring": "100% 50%",
  "cyberpunk-2077": "0% 100%",
  "the-witcher-3": "50% 100%",
  "stardew-valley": "100% 100%",
};

export function ThemeCaptureIcon({ theme, className = "h-7 w-7" }: ThemeCaptureIconProps) {
  if (theme === "default") return <Icon name="capture" className={className} />;

  if (theme === "pokemon") {
    return (
      <svg viewBox="0 0 100 100" className={className} aria-hidden="true">
        <defs>
          <clipPath id="pokeball-circle">
            <circle cx="50" cy="50" r="44" />
          </clipPath>
        </defs>
        <g clipPath="url(#pokeball-circle)">
          <rect width="100" height="100" fill="#ffffff" />
          <path d="M0 0h100v48H0z" fill="#ff1f25" />
          <path d="M55 0c24 7 39 25 43 48H77C74 27 66 11 55 0Z" fill="#e7191e" />
          <path d="M77 56h21c-4 23-20 39-43 44 13-11 20-26 22-44Z" fill="#dedede" />
          <rect x="0" y="44" width="100" height="12" fill="#050505" />
        </g>
        <circle cx="50" cy="50" r="44" fill="none" stroke="#050505" strokeWidth="1.5" />
        <circle cx="50" cy="50" r="14" fill="#050505" />
        <circle cx="50" cy="50" r="8" fill="#ffffff" />
      </svg>
    );
  }

  const backgroundPosition = themeSpritePositions[theme];
  if (!backgroundPosition) return <Icon name="capture" className={className} />;

  return (
    <span
      aria-hidden="true"
      className={`${className} block shrink-0 bg-no-repeat`}
      style={{
        backgroundImage: 'url("/theme-icons/theme-sprite.png")',
        backgroundPosition,
        backgroundSize: "300% 300%",
      }}
    />
  );
}
