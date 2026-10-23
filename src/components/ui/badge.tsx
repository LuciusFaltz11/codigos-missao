import { cn } from "@/lib/utils";

const tones = {
  neutral: "bg-gold-soft text-ink",
  fogo: "bg-fire/15 text-fire",
  terra: "bg-earth/15 text-earth",
  ar: "bg-air/15 text-air",
  agua: "bg-water/15 text-water",
};

export function Badge({
  children,
  tone = "neutral",
  className,
}: {
  children: React.ReactNode;
  tone?: keyof typeof tones;
  className?: string;
}) {
  return (
    <span className={cn("inline-flex rounded-full px-2.5 py-1 text-xs font-semibold", tones[tone], className)}>
      {children}
    </span>
  );
}
