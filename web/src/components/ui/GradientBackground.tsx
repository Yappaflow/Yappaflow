import { cn } from "@/lib/cn";

interface GradientBackgroundProps {
  children: React.ReactNode;
  variant?: "warm" | "cool";
  className?: string;
}

const gradients = {
  warm: "bg-gradient-to-br from-brand-orange via-brand-peach to-brand-peach-light",
  cool: "bg-gradient-to-br from-brand-blue via-brand-purple to-brand-pink",
};

export function GradientBackground({
  children,
  variant = "warm",
  className,
}: GradientBackgroundProps) {
  return (
    <div className={cn("relative overflow-hidden", gradients[variant], className)}>
      {children}
    </div>
  );
}
