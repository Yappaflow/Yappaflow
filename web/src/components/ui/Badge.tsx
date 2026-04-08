import { cn } from "@/lib/cn";

interface BadgeProps {
  children: React.ReactNode;
  variant?: "default" | "active";
  className?: string;
}

export function Badge({ children, variant = "default", className }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-3 py-1 text-sm font-medium",
        variant === "active"
          ? "bg-brand-black text-white"
          : "border border-brand-gray-200 text-brand-gray-900",
        className
      )}
    >
      {children}
    </span>
  );
}
