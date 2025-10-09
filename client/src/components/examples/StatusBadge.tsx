import { StatusBadge } from "../StatusBadge";

export default function StatusBadgeExample() {
  return (
    <div className="p-8 bg-background flex gap-4">
      <StatusBadge status="accepted" />
      <StatusBadge status="rejected" />
      <StatusBadge status="processing" />
    </div>
  );
}
