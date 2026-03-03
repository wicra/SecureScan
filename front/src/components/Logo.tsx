import { Shield } from "lucide-react";

export function Logo({ size = "md" }: { size?: "sm" | "md" | "lg" }) {
  const iconSizes = { sm: "w-7 h-7", md: "w-8 h-8", lg: "w-9 h-9" };
  const iconStrokeSizes = { sm: 16, md: 18, lg: 20 };
  const textSizes = { sm: "text-sm", md: "text-base", lg: "text-lg" };
  return (
    <div className="flex items-center gap-2">
      <div
        className={`${iconSizes[size]} bg-(--color-accent) rounded-lg flex items-center justify-center text-white`}
      >
        <Shield size={iconStrokeSizes[size]} strokeWidth={2.5} />
      </div>
      <div className={`font-(--font-space-mono) tracking-tight ${textSizes[size]}`}>
        Secure<span className="text-(--color-accent)">Scan</span>
      </div>
    </div>
  );
}
