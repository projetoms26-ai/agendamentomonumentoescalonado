import { APPROVAL_INFO, type ApprovalState } from "@/lib/customer-approval";

export function ApprovalBadge({ state }: { state: ApprovalState }) {
  const info = APPROVAL_INFO[state];
  return (
    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${info.cls}`}>
      {info.label}
    </span>
  );
}
