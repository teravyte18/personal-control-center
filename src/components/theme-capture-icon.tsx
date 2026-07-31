import { Icon } from "@/components/icon";
import type { ThemeId } from "@/lib/theme";

type ThemeCaptureIconProps = {
  theme: ThemeId;
  className?: string;
};

const themeSpritePositions: Partial<Record<ThemeId, string>> = {
  pokemon: "0% 0%",
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
