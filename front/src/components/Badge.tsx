type Severity = "critical" | "high" | "medium" | "low" | "owasp";

const styles: Record<Severity, string> = {
  critical: "bg-[rgba(239,68,68,0.15)] text-(--color-red)",
  high: "bg-[rgba(249,115,22,0.15)] text-(--color-orange)",
  medium: "bg-[rgba(234,179,8,0.15)] text-(--color-yellow)",
  low: "bg-[rgba(34,197,94,0.15)] text-(--color-green)",
  owasp: "bg-[rgba(168,85,247,0.12)] text-(--color-purple)",
};

export function Badge({
  children,
  severity,
}: {
  children: React.ReactNode;
  severity: Severity;
}) {
  return (
    <span
      className={`inline-block px-2.5 py-[3px] rounded text-[11px] font-semibold ${styles[severity]}`}
    >
      {children}
    </span>
  );
}
