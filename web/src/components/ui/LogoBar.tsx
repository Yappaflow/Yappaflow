import { cn } from "@/lib/cn";
import {
  ShoppingBag,
  Globe,
  Layout,
  Store,
  Server,
} from "lucide-react";

const logos = [
  { name: "Shopify", Icon: ShoppingBag },
  { name: "WordPress", Icon: Globe },
  { name: "Webflow", Icon: Layout },
  { name: "IKAS", Icon: Store },
  { name: "Hostinger", Icon: Server },
];

interface LogoBarProps {
  label?: string;
  className?: string;
}

export function LogoBar({ label, className }: LogoBarProps) {
  return (
    <div className={cn("text-center", className)}>
      {label && (
        <p className="mb-6 text-sm text-gray-500">{label}</p>
      )}
      <div className="flex flex-wrap items-center justify-center gap-8 md:gap-12">
        {logos.map(({ name, Icon }) => (
          <div
            key={name}
            className="flex items-center gap-2 text-gray-400 transition-colors hover:text-gray-600"
          >
            <Icon className="h-5 w-5" />
            <span className="text-sm font-semibold tracking-wide">{name}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
