import { scoreCor } from "@/lib/lead-score";

interface LeadScoreBadgeProps {
  score: number | null | undefined;
}

export function LeadScoreBadge({ score }: LeadScoreBadgeProps) {
  if (score == null) {
    return <span className="text-xs text-zinc-600">—</span>;
  }

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold ${scoreCor(score)}`}
    >
      {score}
    </span>
  );
}
