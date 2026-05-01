/**
 * DecisionTimeline.tsx
 *
 * Figma-matching Decision Timeline component for the Uplaud business dashboard.
 * Shows AI-generated review decisions with Signal → Recommendation → Outcome flow.
 */

import React, { useState, useMemo } from "react";
import {
  ArrowRight,
  CheckCircle2,
  Clock,
  Send,
  XCircle,
  ShieldAlert,
  Star,
  TrendingUp,
  Users,
  ClipboardCheck,
  Zap,
  AlertTriangle,
  ThumbsUp,
} from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

/* ─── Types ─── */
export interface DecisionReview {
  record_id?: string | null;
  user?: string;
  uplaud?: string;
  date?: Date | null;
  score?: number | null;
  businessName?: string;
  sentiment?: "high" | "medium" | "low" | null;
  category_nba?: string | null;
  next_best_action?: string | null;
  suggested_message?: string | null;
  human_rationale?: string | null;
  nba_status?: "pending_approval" | "approved" | "sent" | "ignored" | null;
  needs_human_review?: boolean;
  uplaud_score?: number | null;
  signals?: string[];
  platforms?: string[];
}

/* ─── Helpers ─── */
function timeAgo(date: Date | null | undefined): string {
  if (!date) return "Unknown";
  const diff = Date.now() - date.getTime();
  const mins = Math.round(diff / 60000);
  if (mins < 60) return `${mins} minute${mins !== 1 ? "s" : ""} ago`;
  const hrs = Math.round(diff / 3600000);
  if (hrs < 24) return `${hrs} hour${hrs !== 1 ? "s" : ""} ago`;
  const days = Math.round(diff / 86400000);
  return `${days} day${days !== 1 ? "s" : ""} ago`;
}

function formatAction(action: string): string {
  return action.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
}

/* ─── Sentiment config ─── */
const sentimentConfig = {
  high: { label: "High Sentiment", color: "bg-green-100 text-green-700 border-green-200", dot: "bg-green-500" },
  medium: { label: "Medium Sentiment", color: "bg-amber-100 text-amber-700 border-amber-200", dot: "bg-amber-400" },
  low: { label: "Low Sentiment", color: "bg-red-100 text-red-700 border-red-200", dot: "bg-red-500" },
};

const statusConfig = {
  pending_approval: { label: "Pending", color: "bg-orange-100 text-orange-700 border-orange-200", icon: <Clock className="w-3 h-3" /> },
  approved: { label: "Approved", color: "bg-blue-100 text-blue-700 border-blue-200", icon: <CheckCircle2 className="w-3 h-3" /> },
  sent: { label: "Sent", color: "bg-green-100 text-green-700 border-green-200", icon: <Send className="w-3 h-3" /> },
  ignored: { label: "Ignored", color: "bg-gray-100 text-gray-500 border-gray-200", icon: <XCircle className="w-3 h-3" /> },
};

/* ─── Stat Card ─── */
function StatCard({
  label,
  value,
  delta,
  deltaLabel,
  icon,
  iconBg,
}: {
  label: string;
  value: number;
  delta?: string;
  deltaLabel?: string;
  icon: React.ReactNode;
  iconBg: string;
}) {
  return (
    <div className="flex-1 min-w-0 bg-white border border-gray-100 rounded-xl p-4 flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="text-xs text-gray-500 font-medium">{label}</span>
        <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${iconBg}`}>{icon}</div>
      </div>
      <div className="text-3xl font-bold text-gray-900">{value}</div>
      {delta && (
        <div className="text-xs text-green-600 font-medium">
          {delta} <span className="text-gray-400 font-normal">{deltaLabel}</span>
        </div>
      )}
    </div>
  );
}

/* ─── Review Decision Card ─── */
function ReviewDecisionCard({ review }: { review: DecisionReview }) {
  const [expanded, setExpanded] = useState(false);

  const sc = review.sentiment ? sentimentConfig[review.sentiment] : null;
  const st = review.nba_status ? statusConfig[review.nba_status] : null;
  const stars = review.score ?? 0;

  return (
    <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden shadow-sm">
      {/* ── Header row ── */}
      <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-50">
        {/* Sentiment dot */}
        <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${sc?.dot ?? "bg-gray-300"}`} />
        {/* Time */}
        <span className="text-xs text-gray-400 shrink-0">{timeAgo(review.date)}</span>
        {/* Arrow */}
        <ArrowRight className="w-3 h-3 text-gray-300 shrink-0" />
        {/* Reviewer name */}
        <span className="text-sm font-semibold text-gray-900 truncate">{review.user ?? "Unknown"}</span>
        {/* Sentiment badge */}
        {sc && (
          <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${sc.color} shrink-0`}>
            {sc.label}
          </span>
        )}
        {/* Right side: human review or recommendation-only tag */}
        <div className="ml-auto flex items-center gap-2 shrink-0">
          {review.needs_human_review && (
            <span className="flex items-center gap-1 text-xs font-medium text-red-600 bg-red-50 border border-red-100 px-2 py-0.5 rounded-full">
              <ShieldAlert className="w-3 h-3" /> Human Review
            </span>
          )}
          {review.category_nba && (
            <span className="text-xs text-gray-400 font-medium">Recommendation only</span>
          )}
        </div>
      </div>

      {/* ── Body ── */}
      <div className="px-5 py-4 space-y-4">
        {/* Score + stars + quote */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            {review.uplaud_score != null && (
              <span className="text-xs font-bold bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">
                UPLAUD {review.uplaud_score}
              </span>
            )}
            {/* Stars */}
            <div className="flex items-center gap-0.5">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star
                  key={i}
                  className="w-3.5 h-3.5"
                  fill={i < Math.floor(stars) ? "#F59E0B" : "none"}
                  stroke={i < Math.ceil(stars) ? "#F59E0B" : "#D1D5DB"}
                  strokeWidth={1.5}
                />
              ))}
            </div>
          </div>
          {review.uplaud && (
            <p className="text-sm text-gray-600 leading-relaxed italic">
              "{review.uplaud}"
            </p>
          )}
        </div>

        {/* SIGNALS */}
        <div className="space-y-1.5">
          <span className="text-[10px] font-bold tracking-widest text-gray-400 uppercase">Signals</span>
          <div className="flex flex-wrap items-center gap-2">
            {review.sentiment && (
              <span className="text-xs bg-teal-50 text-teal-700 border border-teal-100 px-2 py-0.5 rounded-full flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" />
                {review.sentiment === "high" ? "Positive sentiment detected"
                  : review.sentiment === "medium" ? "Mixed sentiment detected"
                  : "Negative sentiment detected"}
              </span>
            )}
            {review.platforms?.map((p, i) => (
              <span key={i} className="text-xs text-gray-500">
                {i > 0 && <ArrowRight className="w-3 h-3 inline mx-1 text-gray-300" />}
                {p}
              </span>
            ))}
            {!review.platforms && review.category_nba && (
              <span className="text-xs text-gray-500">{review.category_nba}</span>
            )}
          </div>
        </div>

        {/* RECOMMENDATION */}
        {(review.next_best_action || review.suggested_message || review.human_rationale) && (
          <div className="rounded-xl bg-amber-50 border border-amber-100 p-3 space-y-2">
            <span className="text-[10px] font-bold tracking-widest text-amber-600 uppercase flex items-center gap-1">
              <AlertTriangle className="w-3 h-3" /> Recommendation
            </span>
            {review.human_rationale && (
              <p className="text-sm text-gray-700">{review.human_rationale}</p>
            )}
            {review.suggested_message && !review.human_rationale && (
              <p className={`text-sm text-gray-700 ${expanded ? "" : "line-clamp-2"}`}>
                {review.suggested_message}
              </p>
            )}
            {review.next_best_action && (
              <p className="text-xs text-amber-700 font-medium">
                Action: {formatAction(review.next_best_action)}
              </p>
            )}
            {/* Approve button */}
            {review.nba_status === "pending_approval" && (
              <Button
                size="sm"
                className="bg-purple-600 hover:bg-purple-700 text-white rounded-full px-4 text-xs font-semibold h-7"
              >
                Approve
              </Button>
            )}
          </div>
        )}

        {/* OUTCOME */}
        <div className="flex items-center gap-3 pt-1">
          <span className="text-[10px] font-bold tracking-widest text-gray-400 uppercase">Outcome</span>
          {st ? (
            <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-0.5 rounded-full border ${st.color}`}>
              {st.icon} {st.label}
            </span>
          ) : (
            <span className="text-xs text-gray-400 italic">No status set</span>
          )}
          {review.next_best_action && (
            <span className="text-xs text-gray-400 flex items-center gap-1">
              <ClipboardCheck className="w-3 h-3" /> Drafted {formatAction(review.next_best_action)}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

/* ─── Main Component ─── */
interface DecisionTimelineProps {
  reviews: DecisionReview[];
  loading?: boolean;
}

export function DecisionTimeline({ reviews, loading }: DecisionTimelineProps) {
  const [autoDecisions, setAutoDecisions] = useState(true);
  const [activeTab, setActiveTab] = useState<"pending" | "completed" | "all">("pending");

  // Derive stats from reviews
  const stats = useMemo(() => {
    const total = reviews.length;
    const pending = reviews.filter((r) => r.nba_status === "pending_approval").length;
    const humanRequired = reviews.filter((r) => r.needs_human_review).length;
    const positive = reviews.filter((r) => r.sentiment === "high").length;
    return { total, pending, humanRequired, positive };
  }, [reviews]);

  // Tab filtering
  const filtered = useMemo(() => {
    if (activeTab === "pending") return reviews.filter((r) => r.nba_status === "pending_approval");
    if (activeTab === "completed") return reviews.filter((r) => r.nba_status === "approved" || r.nba_status === "sent" || r.nba_status === "ignored");
    return reviews;
  }, [reviews, activeTab]);

  const pendingCount = reviews.filter((r) => r.nba_status === "pending_approval").length;
  const completedCount = reviews.filter((r) => r.nba_status === "approved" || r.nba_status === "sent" || r.nba_status === "ignored").length;

  return (
    <div className="space-y-5">
      {/* ── Page header ── */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Decision Timeline</h2>
          <p className="text-sm text-gray-500 mt-0.5">
            Chronological feed of AI reasoning — explainable autonomous actions.
          </p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <div className="text-right">
            <p className="text-xs font-semibold text-gray-700">Automatic decisions</p>
            <p className="text-[10px] text-gray-400">System executes actions</p>
          </div>
          <Switch
            checked={autoDecisions}
            onCheckedChange={setAutoDecisions}
            className="data-[state=checked]:bg-purple-600"
          />
        </div>
      </div>

      {/* ── Stat cards ── */}
      <div className="flex gap-3 overflow-x-auto pb-1">
        <StatCard
          label="Autonomous Decisions Today"
          value={stats.total}
          delta="+18%"
          deltaLabel="vs yesterday"
          iconBg="bg-purple-100"
          icon={<Zap className="w-4 h-4 text-purple-600" />}
        />
        <StatCard
          label="Positive Trust Impact"
          value={stats.positive}
          delta="+12%"
          deltaLabel="today"
          iconBg="bg-blue-100"
          icon={<TrendingUp className="w-4 h-4 text-blue-600" />}
        />
        <StatCard
          label="Review Decisions"
          value={stats.total}
          delta="+5%"
          deltaLabel="today"
          iconBg="bg-amber-100"
          icon={<Star className="w-4 h-4 text-amber-500" />}
        />
        <StatCard
          label="Human Actions Required"
          value={stats.humanRequired}
          delta={stats.humanRequired === 0 ? "0%" : undefined}
          deltaLabel="today"
          iconBg="bg-red-100"
          icon={<Users className="w-4 h-4 text-red-500" />}
        />
      </div>

      {/* ── Tabs ── */}
      <div className="flex items-center gap-1 border-b border-gray-200">
        {[
          { key: "pending", label: "Pending Decisions", count: pendingCount, dot: true },
          { key: "completed", label: "Completed / Reviewed", count: completedCount },
          { key: "all", label: "All Decisions", count: reviews.length },
        ].map(({ key, label, count, dot }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key as "pending" | "completed" | "all")}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              activeTab === key
                ? "border-amber-500 text-gray-900"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            {dot && activeTab === key && (
              <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0" />
            )}
            {label}
            <span className={`text-xs font-bold ${activeTab === key ? "text-gray-700" : "text-gray-400"}`}>
              {count}
            </span>
          </button>
        ))}
      </div>

      {/* ── Review cards ── */}
      {loading ? (
        <div className="text-center py-10 text-gray-400">Loading decisions…</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-10 text-gray-400">
          No decisions in this category yet.
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map((review, i) => (
            <ReviewDecisionCard key={review.record_id ?? i} review={review} />
          ))}
        </div>
      )}
    </div>
  );
}
