import { cn } from "@/lib/cn";

interface CardProps {
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
}

export function Card({ children, className, hover = false }: CardProps) {
  return (
    <div
      className={cn(
        "rounded-2xl bg-white p-6 shadow-card",
        hover && "transition-all duration-300 hover:-translate-y-1 hover:shadow-card-hover",
        className
      )}
    >
      {children}
    </div>
  );
}
