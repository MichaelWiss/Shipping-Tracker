type Variant = "A" | "B" | "C" | "D" | "E" | "default";

const VARIANT_CLASSES: Record<Variant, string> = {
  A: "bg-cii-a/15 text-cii-a border-cii-a/30",
  B: "bg-cii-b/15 text-cii-b border-cii-b/30",
  C: "bg-cii-c/15 text-cii-c border-cii-c/30",
  D: "bg-cii-d/15 text-cii-d border-cii-d/30",
  E: "bg-cii-e/15 text-cii-e border-cii-e/30",
  default: "bg-cream-2 text-ink-2 border-rule-lt",
};

interface BadgeProps {
  label: string;
  variant?: Variant;
  className?: string;
}

export default function Badge({
  label,
  variant = "default",
  className = "",
}: BadgeProps) {
  return (
    <span
      className={`inline-block border px-1.5 py-0.5 font-mono text-[8px] uppercase leading-none tracking-[0.10em] ${VARIANT_CLASSES[variant]} ${className}`}
    >
      {label}
    </span>
  );
}
