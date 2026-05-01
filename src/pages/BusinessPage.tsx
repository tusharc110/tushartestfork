import React, { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import {
  ArrowLeft,
  MapPin,
  Tag,
  Users,
  Share2,
  Star,
  ClipboardList,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Send,
  XCircle,
  ChevronDown,
  ChevronUp,
  Filter,
  MessageSquare,
  Lightbulb,
  ShieldAlert,
} from "lucide-react";
import axios from "axios";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { motion, AnimatePresence } from "framer-motion";
import { DecisionTimeline } from "@/components/DecisionTimeline";

/* ===================== Utils ===================== */
function slugify(name = "") {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)+/g, "");
}
function formatDate(date?: Date | null) {
  if (!date) return "";
  return date.toLocaleDateString(undefined, {
    month: "long",
    day: "2-digit",
    year: "numeric",
  });
}
function emojiForScore(score?: number | null) {
  if (!score) return "🤍";
  if (score >= 5) return "🔥";
  if (score === 4) return "😍";
  if (score === 3) return "🙂";
  if (score === 2) return "😐";
  return "😶";
}
function isValidCity(value?: string) {
  if (!value) return false;
  const s = value.trim();
  if (!s) return false;
  const placeholders = new Set([
    "unknown",
    "n/a",
    "na",
    "none",
    "-",
    "--",
    "null",
    "undefined",
    "not available",
  ]);
  return !placeholders.has(s.toLowerCase());
}

/* ===================== Sticky Logo Navbar ===================== */
function StickyLogoNavbar() {
  const [isScrolled, setIsScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setIsScrolled(window.scrollY > 10);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isScrolled
          ? "bg-[#6214a8]/95 backdrop-blur-sm shadow-md py-2"
          : "bg-transparent py-4"
      }`}
    >
      <div className="container max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center">
          <Link to="/" className="flex items-center">
            <img
              alt="Uplaud Logo"
              className="h-10 w-auto object-fill"
              src="/lovable-uploads/ba7f1f54-2df2-4f44-8af1-522b7ccc0810.png"
            />
          </Link>
          <div className="w-10 h-10" />
        </div>
      </div>
    </nav>
  );
}

/* ===================== “What people are saying” (no external NLP) ===================== */
function MostMentionedWordsCard({ reviews }: { reviews: any[] }) {
  const keywords = useMemo(() => {
    const texts = (reviews || [])
      .map((r) => (typeof r?.uplaud === "string" ? r.uplaud.trim() : ""))
      .filter(Boolean);

    const STOP = new Set([
      "the","a","an","and","or","but","to","of","in","on","at","for","from","by","with","about","as",
      "is","are","was","were","be","been","being","it","its","this","that","these","those",
      "i","me","my","we","our","you","your","he","him","his","she","her","they","them","their",
      "there","here","very","so","just","not","no","yes","if","than","then","when","while","because",
      "into","out","over","under","again","more","most","some","such","can","could","should","would",
      "did","do","does","done","has","have","had","will","won't","can't","don't","didn't","it's",
      "u","ur","im","ive","id","we're","you're","they're","i'm","i’ve","i’d","you’ve","you’d",
    ]);

    const counts: Record<string, number> = {};
    for (const t of texts) {
      const words = t
        .toLowerCase()
        .replace(/[^a-z\s-]/g, " ")
        .split(/\s+/)
        .filter(Boolean);

      for (let w of words) {
        w = w.replace(/-+/g, "-").replace(/^-|-$/g, "");
        if (!w || w.length < 3 || w === "-" || STOP.has(w)) continue;
        counts[w] = (counts[w] || 0) + 1;
      }
    }

    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 12)
      .map(([word, count]) => ({ word, count }));
  }, [reviews]);

  return (
    <div
      className="rounded-2xl sm:rounded-3xl p-6 sm:p-8 border shadow-lg h-full"
      style={{
        background: "rgba(255,255,255,0.75)",
        backdropFilter: "blur(8px)",
        borderColor: "rgba(255,255,255,0.6)",
      }}
    >
      <h3 className="text-xl sm:text-2xl font-black text-black mb-4 sm:mb-5">
        What people are saying
      </h3>
      {keywords.length ? (
        <div className="flex flex-wrap gap-2.5 sm:gap-3">
          {keywords.map(({ word, count }) => (
            <div
              key={word}
              className="bg-purple-100 text-purple-700 px-4 sm:px-6 py-2.5 sm:py-3 rounded-full font-semibold hover:bg-purple-200 transition"
              title={`${count} mention${count === 1 ? "" : "s"}`}
            >
              {word} ({count})
            </div>
          ))}
        </div>
      ) : (
        <div className="text-gray-500 text-base">No common keywords found yet.</div>
      )}
    </div>
  );
}

/* ===================== Analytics mini-cards ===================== */
function UniqueReviewersTab({ numReviewers }: { numReviewers: number }) {
  return (
    <div className="flex flex-col items-center justify-center h-full py-8">
      <div className="inline-flex items-center justify-center w-16 h-16 rounded-full mb-3 bg-purple-100 text-purple-700 shadow-md">
        <Users className="w-8 h-8" />
      </div>
      <div className="text-3xl font-black text-black mb-1">{numReviewers}</div>
      <div className="text-lg font-black text-gray-600 mb-1">
        Unique Reviewer{numReviewers === 1 ? "" : "s"}
      </div>
      <div className="mt-1 text-base text-gray-600 text-center">
        This business has received {numReviewers} unique review{numReviewers === 1 ? "" : "s"} from real users.
      </div>
    </div>
  );
}
function OverallSentimentTab({ sentimentScore }: { sentimentScore: number }) {
  const steps = [
    { emoji: "🔥", label: "Amazing" },
    { emoji: "😍", label: "Love it" },
    { emoji: "🙂", label: "Okay" },
    { emoji: "😶", label: "Issues" },
  ];
  return (
    <div className="flex flex-col justify-center h-full py-6">
      <h4 className="text-xl font-bold text-black mb-6 text-center">Overall sentiment</h4>
      <div className="bg-gray-100 rounded-full h-8 overflow-hidden mb-3">
        <div className="h-full flex">
          <div
            className="h-full flex items-center justify-center text-white text-sm font-bold transition-all duration-1000 ease-out bg-gradient-to-r from-purple-600 to-purple-500"
            style={{ width: `${sentimentScore}%` }}
          >
            {sentimentScore > 7 ? `${sentimentScore}%` : ""}
          </div>
          <div
            className="bg-gray-400 flex items-center justify-center text-white text-sm font-bold"
            style={{ width: `${100 - sentimentScore}%` }}
          >
            {sentimentScore <= 7 ? `${sentimentScore}%` : ""}
          </div>
        </div>
      </div>
      <div className="flex justify-center gap-8 mt-4 mb-1">
        {steps.map(({ emoji, label }) => (
          <div key={label} className="flex flex-col items-center min-w-[48px]">
            <span className="text-2xl">{emoji}</span>
            <span className="text-gray-700 font-medium text-xs mt-1">{label}</span>
          </div>
        ))}
      </div>
      <div className="text-center font-semibold text-base mt-5">
        <span className="text-purple-600">{sentimentScore}% satisfaction based on all reviews</span>
      </div>
    </div>
  );
}
function RightAnalyticsTabs({
  numReviewers,
  sentimentScore,
}: {
  numReviewers: number;
  sentimentScore: number;
}) {
  const [tab, setTab] = useState<"reviewers" | "sentiment">("reviewers");
  const [auto, setAuto] = useState(true);

  useEffect(() => {
    if (!auto) return;
    const t = setInterval(
      () => setTab((p) => (p === "reviewers" ? "sentiment" : "reviewers")),
      4000
    );
    return () => clearInterval(t);
  }, [auto]);

  return (
    <motion.div
      className="rounded-2xl sm:rounded-3xl p-6 sm:p-8 border shadow-lg h-full"
      style={{
        background: "rgba(255,255,255,0.75)",
        backdropFilter: "blur(8px)",
        borderColor: "rgba(255,255,255,0.6)",
      }}
      onMouseLeave={() => setAuto(true)}
    >
      <div className="flex justify-center gap-2 mb-4">
        <motion.button
          className={`px-5 py-2 rounded-full font-semibold ${
            tab === "reviewers"
              ? "bg-purple-600 text-white shadow"
              : "bg-purple-50 text-purple-700 hover:bg-purple-100"
          }`}
          whileTap={{ scale: 0.98 }}
          onClick={() => {
            setTab("reviewers");
            setAuto(false);
          }}
        >
          Unique Reviewers
        </motion.button>
        <motion.button
          className={`px-5 py-2 rounded-full font-semibold ${
            tab === "sentiment"
              ? "bg-purple-600 text-white shadow"
              : "bg-purple-50 text-purple-700 hover:bg-purple-100"
          }`}
          whileTap={{ scale: 0.98 }}
          onClick={() => {
            setTab("sentiment");
            setAuto(false);
          }}
        >
          Overall Sentiment
        </motion.button>
      </div>

      <AnimatePresence mode="wait">
        {tab === "reviewers" ? (
          <motion.div
            key="reviewers"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            <UniqueReviewersTab numReviewers={numReviewers} />
          </motion.div>
        ) : (
          <motion.div
            key="sentiment"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            <OverallSentimentTab sentimentScore={sentimentScore} />
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

/* ===================== Header (colorful chips + mobile claim) ===================== */
function BusinessHeader({
  name,
  city,
  category,
  totalReviews,
  referralCount,
  onShare,
}: {
  name: string;
  city: string;
  category: string;
  totalReviews: number;
  referralCount: number;
  onShare: () => void;
}) {
  const handleClaimClick = () => {
    window.open(
      "https://docs.google.com/forms/d/e/1FAIpQLScOFSp2wEGN50-d58e43laMRW2RuPbEr4407R34pZVw4eDYhA/viewform",
      "_blank"
    );
  };
  const showCity = isValidCity(city);

  const Pill = ({
    bg,
    ring,
    text,
    icon,
    label,
    value,
  }: {
    bg: string;
    ring: string;
    text: string;
    icon: React.ReactNode;
    label: string;
    value: number | string;
  }) => (
    <div
      className={`px-5 sm:px-6 py-2.5 sm:py-3 rounded-full font-semibold flex items-center gap-2 ${bg} ${ring} ${text}`}
      style={{ backdropFilter: "blur(4px)" }}
    >
      {icon}
      <span className="tabular-nums">{value}</span>
      <span className="whitespace-nowrap">{label}</span>
    </div>
  );

  return (
    <div
      className="rounded-2xl sm:rounded-3xl p-6 sm:p-8 border shadow-sm mb-8 sm:mb-10 flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-4 sm:gap-6"
      style={{
        background: "rgba(255,255,255,0.75)",
        backdropFilter: "blur(8px)",
        borderColor: "rgba(255,255,255,0.6)",
      }}
    >
      <div className="flex-1 min-w-0 w-full">
        <div className="flex items-start justify-between gap-3">
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-black text-black tracking-tight break-words whitespace-normal">
            {name}
          </h1>

          <button
            onClick={onShare}
            className="sm:hidden shrink-0 inline-flex items-center justify-center rounded-lg border border-gray-200 bg-white/80 p-2 shadow"
            aria-label="Share business"
            title="Share"
          >
            <Share2 className="w-5 h-5 text-gray-700" />
          </button>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-3 sm:gap-4">
          {showCity && (
            <Badge className="bg-purple-100 text-purple-700 hover:bg-purple-200 px-5 sm:px-6 py-2.5 sm:py-3 rounded-full text-sm sm:text-base font-semibold border-0 flex items-center gap-2">
              <MapPin className="w-4 h-4 sm:w-5 sm:h-5" />
              {city}
            </Badge>
          )}
          {category && (
            <Badge className="bg-gray-100 text-gray-700 hover:bg-gray-200 px-5 sm:px-6 py-2.5 sm:py-3 rounded-full text-sm sm:text-base font-semibold border-0 flex items-center gap-2">
              <Tag className="w-4 h-4 sm:w-5 sm:h-5" />
              {category}
            </Badge>
          )}

          <Pill
            bg="bg-amber-50"
            ring="ring-1 ring-amber-200"
            text="text-amber-800"
            icon={<Star className="w-4 h-4" />}
            label="Reviews"
            value={totalReviews}
          />
          <Pill
            bg="bg-rose-50"
            ring="ring-1 ring-rose-200"
            text="text-rose-800"
            icon={<ClipboardList className="w-4 h-4" />}
            label="Referrals"
            value={referralCount}
          />
        </div>

        <div className="sm:hidden mt-4">
          <Button
            variant="outline"
            className="w-full border-2 border-purple-200 text-purple-600 hover:bg-purple-50 hover:border-purple-300 rounded-full px-6 py-3 font-semibold"
            onClick={handleClaimClick}
          >
            Claim this business
          </Button>
        </div>
      </div>

      <div className="hidden sm:flex flex-col items-end gap-2">
        <button
          onClick={onShare}
          className="inline-flex items-center justify-center border border-gray-200 text-gray-700 px-3 py-2 rounded-lg shadow w-fit"
          title="Share"
          style={{ background: "rgba(255,255,255,0.8)", backdropFilter: "blur(6px)" }}
        >
          <Share2 className="w-5 h-5" />
        </button>

        <Button
          variant="outline"
          className="border-2 border-purple-200 text-purple-600 hover:bg-purple-50 hover:border-purple-300 rounded-full px-8 py-3 font-semibold whitespace-nowrap"
          onClick={handleClaimClick}
        >
          Claim this business
        </Button>
      </div>
    </div>
  );
}

/* ===================== Page ===================== */
const BusinessPage = () => {
  const { slug } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [business, setBusiness] = useState({
    name: "",
    city: "",
    category: "",
    reviews: [] as any[],
  });
  const [sentimentScore, setSentimentScore] = useState(0);
  const [referralMeta, setReferralMeta] = useState({
    numReferrals: 0,
    numReviewers: 0,
  });

  const [showAllReviews, setShowAllReviews] = useState(false);
  const [activeTab, setActiveTab] = useState<"reviews" | "timeline">("reviews");

  // Decision Timeline filters
  const [filterSentiment, setFilterSentiment] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterHumanReview, setFilterHumanReview] = useState<string>("all");
  const [showTimelineFilters, setShowTimelineFilters] = useState(false);

  useEffect(() => {
    if (!slug) return;

    const controller = new AbortController();
    const fetchData = async () => {
      setLoading(true);
      try {
        // ===== Reviews (via server) =====
        const { data: rev } = await axios.get("/api/reviews", {
          params: { businessSlug: slug },
          signal: controller.signal,
        });
        const rawReviews = Array.isArray(rev?.reviews) ? rev.reviews : [];

        const filtered = rawReviews
          .map((r: any) => ({
            record_id: r.record_id || null,
            user: r.user || "Anonymous",
            uplaud: r.uplaud || "",
            date: r.date ? new Date(r.date) : null,
            score: typeof r.score === "number" ? r.score : null,
            location: r.location || "",
            category: r.category || "",
            business_name: r.businessName || "",
            // NBA fields
            sentiment: r.sentiment || null,
            category_nba: r.category_nba || null,
            next_best_action: r.next_best_action || null,
            suggested_message: r.suggested_message || null,
            human_rationale: r.human_rationale || null,
            nba_status: r.nba_status || null,
            needs_human_review: !!r.needs_human_review,
          }))
          .filter((r: any) => r.business_name && r.uplaud);

        // Sentiment
        let computedSentiment = 0;
        if (filtered.length) {
          const totalStars = filtered.reduce((sum, r) => sum + (r.score || 0), 0);
          computedSentiment = Math.round((totalStars / (filtered.length * 5)) * 100);
        }

        // ===== Referrals (via server) =====
        const { data: circ } = await axios.get("/api/circles", {
          params: { businessSlug: slug },
          signal: controller.signal,
        });
        const circles = Array.isArray(circ?.circles) ? circ.circles : [];

        const initiatorSet = new Set<string>();
        circles.forEach((c: any) => {
          if (c?.Initiator) initiatorSet.add(c.Initiator);
        });

        const reviewersSet = new Set<string>();
        filtered.forEach((r: any) => {
          if (r.user && r.user !== "Anonymous") reviewersSet.add(r.user);
        });

        const numReferrals = initiatorSet.size;
        const numReviewers = reviewersSet.size;
        const firstCity =
          filtered.find((r: any) => isValidCity(r.location))?.location?.trim() || "";

        setReferralMeta({ numReferrals, numReviewers });
        setBusiness({
          name: filtered[0]?.business_name || slug.replace(/-/g, " "),
          city: firstCity,
          category: filtered[0]?.category || "",
          reviews: filtered,
        });
        setSentimentScore(computedSentiment);
      } catch (_err) {
        // Gracefully degrade if your API/proxy is offline
        setBusiness({
          name: slug.replace(/-/g, " "),
          city: "",
          category: "",
          reviews: [],
        });
        setSentimentScore(0);
        setReferralMeta({ numReferrals: 0, numReviewers: 0 });
      } finally {
        setLoading(false);
      }
    };

    fetchData();
    return () => controller.abort();
  }, [slug]);

  /* ========= SHARE ========= */
  function handleShareForBusiness() {
    const link = `${window.location.origin}/business/${slug}`;
    const message = `Hey, check out Real Reviews for ${business.name} on Uplaud. It’s a platform where real people give honest reviews on WhatsApp:\n${link}`;
    const wa = `https://wa.me/?text=${encodeURIComponent(message)}`;
    window.location.href = wa;
  }

  /* ========= Decision Timeline filtered reviews ========= */
  const timelineReviews = useMemo(() => {
    return business.reviews.filter((r: any) => {
      if (filterSentiment !== "all" && r.sentiment !== filterSentiment) return false;
      if (filterStatus !== "all" && r.nba_status !== filterStatus) return false;
      if (filterHumanReview === "yes" && !r.needs_human_review) return false;
      if (filterHumanReview === "no" && r.needs_human_review) return false;
      return true;
    });
  }, [business.reviews, filterSentiment, filterStatus, filterHumanReview]);

  /* ========= DECISION TIMELINE CARD ========= */
  function DecisionTimelineCard({ review }: { review: any }) {
    const [expanded, setExpanded] = useState(false);

    const sentimentConfig: Record<string, { bg: string; text: string; label: string; icon: React.ReactNode }> = {
      high:   { bg: "bg-green-100",  text: "text-green-800",  label: "High",   icon: <CheckCircle2 className="w-3.5 h-3.5" /> },
      medium: { bg: "bg-amber-100",  text: "text-amber-800",  label: "Medium", icon: <Clock className="w-3.5 h-3.5" /> },
      low:    { bg: "bg-red-100",    text: "text-red-800",    label: "Low",    icon: <AlertTriangle className="w-3.5 h-3.5" /> },
    };

    const statusConfig: Record<string, { bg: string; text: string; label: string; icon: React.ReactNode }> = {
      pending_approval: { bg: "bg-yellow-100", text: "text-yellow-800", label: "Pending Approval", icon: <Clock className="w-3.5 h-3.5" /> },
      approved:         { bg: "bg-blue-100",   text: "text-blue-800",   label: "Approved",         icon: <CheckCircle2 className="w-3.5 h-3.5" /> },
      sent:             { bg: "bg-green-100",  text: "text-green-800",  label: "Sent",             icon: <Send className="w-3.5 h-3.5" /> },
      ignored:          { bg: "bg-gray-100",   text: "text-gray-600",   label: "Ignored",          icon: <XCircle className="w-3.5 h-3.5" /> },
    };

    const sc = review.sentiment ? sentimentConfig[review.sentiment] : null;
    const st = review.nba_status ? statusConfig[review.nba_status] : null;
    const hasDecision = review.sentiment || review.next_best_action || review.category_nba;

    const formatAction = (action: string) => action.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase());

    return (
      <div
        className="rounded-2xl shadow overflow-hidden transition hover:shadow-xl"
        style={{ background: "rgba(255,255,255,0.95)" }}
      >
        {/* ─── SIGNAL ─── */}
        <div className="px-5 pt-5 pb-3">
          <div className="flex items-start justify-between gap-3 mb-2">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-bold uppercase tracking-wider text-purple-600">Signal</span>
                {review.needs_human_review && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-100 text-red-700 text-xs font-semibold">
                    <ShieldAlert className="w-3 h-3" /> Human Review
                  </span>
                )}
              </div>
              <Link
                to={`/profile/${slugify(review.user)}`}
                className="font-bold text-base text-black hover:text-purple-700 hover:underline"
              >
                {review.user}
              </Link>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {review.score != null && (
                <span className="flex items-center gap-0.5">
                  {Array.from({ length: review.score }).map((_, i) => (
                    <span key={i} className="text-yellow-400 text-sm leading-none">★</span>
                  ))}
                  <span className="ml-1 text-lg leading-none">{emojiForScore(review.score)}</span>
                </span>
              )}
              <span className="text-gray-400 text-xs">{formatDate(review.date)}</span>
            </div>
          </div>
          {/* Review text */}
          <div className="rounded-lg px-4 py-3 text-sm text-gray-800 break-words" style={{ background: "#DCF8C6" }}>
            {review.uplaud}
          </div>
        </div>

        {/* ─── DECISION ─── */}
        <div className="px-5 py-3 border-t border-gray-100">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-purple-600">Decision</span>
            {sc && (
              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${sc.bg} ${sc.text}`}>
                {sc.icon} {sc.label} sentiment
              </span>
            )}
            {review.category_nba && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 text-xs font-semibold">
                <Tag className="w-3 h-3" /> {review.category_nba}
              </span>
            )}
          </div>

          {hasDecision ? (
            <div className="space-y-2">
              {review.next_best_action && (
                <div className="flex items-start gap-2">
                  <Lightbulb className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
                  <div>
                    <span className="text-xs text-gray-500 font-medium">Next Best Action</span>
                    <p className="text-sm font-semibold text-gray-900">{formatAction(review.next_best_action)}</p>
                  </div>
                </div>
              )}

              {review.suggested_message && (
                <div className="flex items-start gap-2">
                  <MessageSquare className="w-4 h-4 text-blue-500 mt-0.5 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <span className="text-xs text-gray-500 font-medium">Suggested Message</span>
                    <p className={`text-sm text-gray-700 ${expanded ? "" : "line-clamp-2"}`}>
                      {review.suggested_message}
                    </p>
                    {review.suggested_message.length > 120 && (
                      <button
                        onClick={() => setExpanded(!expanded)}
                        className="text-xs text-purple-600 font-medium mt-0.5 hover:underline"
                      >
                        {expanded ? "Show less" : "Show more"}
                      </button>
                    )}
                  </div>
                </div>
              )}

              {review.human_rationale && (
                <div className="flex items-start gap-2">
                  <Lightbulb className="w-4 h-4 text-gray-400 mt-0.5 shrink-0" />
                  <div>
                    <span className="text-xs text-gray-500 font-medium">Rationale</span>
                    <p className="text-sm text-gray-600 italic">{review.human_rationale}</p>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <p className="text-sm text-gray-400 italic">No recommendation yet.</p>
          )}
        </div>

        {/* ─── OUTCOME ─── */}
        <div className="px-5 py-3 border-t border-gray-100 flex items-center gap-2">
          <span className="text-xs font-bold uppercase tracking-wider text-purple-600">Outcome</span>
          {st ? (
            <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${st.bg} ${st.text}`}>
              {st.icon} {st.label}
            </span>
          ) : (
            <span className="text-xs text-gray-400 italic">No status set</span>
          )}
        </div>
      </div>
    );
  }

  /* ========= REVIEW CARD ========= */
  function ReviewCard({ review }: { review: any }) {
    return (
      <div
        className="flex flex-col rounded-2xl shadow transition hover:shadow-xl overflow-hidden"
        style={{ background: "#FFF7E6" }}
      >
        <div className="w-full px-5 pt-5">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <Link
              to={`/profile/${slugify(review.user)}`}
              className="w-full sm:flex-1 font-bold text-base sm:text-lg text-black hover:underline hover:text-purple-700 break-words whitespace-normal leading-tight"
              title={review.user}
              style={{ hyphens: "auto" }}
            >
              {review.user}
            </Link>

            <div className="hidden sm:flex items-center gap-3 sm:ml-auto">
              {review.score ? (
                <span className="flex items-center leading-none">
                  {Array.from({ length: review.score }).map((_, i) => (
                    <span key={i} className="text-yellow-400 text-sm sm:text-lg leading-none">
                      ★
                    </span>
                  ))}
                  <span className="ml-1 text-lg sm:text-2xl leading-none">
                    {emojiForScore(review.score)}
                  </span>
                </span>
              ) : null}

              <span className="text-gray-500 text-xs sm:text-sm font-medium leading-none">
                {formatDate(review.date)}
              </span>

              <button
                onClick={handleShareForBusiness}
                className="inline-flex items-center justify-center rounded-md p-2 bg-transparent hover:bg-transparent focus:bg-transparent border-0 shadow-none"
                aria-label="Share this business on WhatsApp"
                title="Share on WhatsApp"
              >
                <Share2 className="w-4 h-4 text-gray-700" />
              </button>
            </div>
          </div>

          {/* Mobile meta */}
          <div className="sm:hidden mt-1 flex items-center justify-between">
            <div className="flex items-center gap-2">
              {review.score ? (
                <span className="flex items-center leading-none">
                  {Array.from({ length: review.score }).map((_, i) => (
                    <span key={i} className="text-yellow-400 text-sm leading-none">
                      ★
                    </span>
                  ))}
                  <span className="ml-1 text-xl leading-none">
                    {emojiForScore(review.score)}
                  </span>
                </span>
              ) : null}
              <span className="text-gray-600 text-xs font-medium leading-none">
                {formatDate(review.date)}
              </span>
            </div>

            <button
              onClick={handleShareForBusiness}
              className="inline-flex items-center justify-center rounded-md p-2 bg-transparent hover:bg-transparent focus:bg-transparent border-0 shadow-none"
              aria-label="Share this business on WhatsApp"
              title="Share on WhatsApp"
            >
              <Share2 className="w-4 h-4 text-gray-700" />
            </button>
          </div>
        </div>

        {/* WhatsApp-style inner bubble */}
        <div className="mt-3 w-full">
          <div
            className="w-full px-5 py-4 text-gray-900 text-base font-medium break-words"
            style={{ background: "#DCF8C6" }}
          >
            <span style={{ display: "block", wordBreak: "break-word" }}>{review.uplaud}</span>
          </div>
        </div>

        <div className="pb-4" />
      </div>
    );
  }

  const totalReviews = business.reviews.length;
  const referralCount = referralMeta.numReferrals;

  return (
    <div
      className="min-h-screen w-full"
      style={{
        background: "transparent",
        fontFamily: `'Inter','Poppins','Segoe UI',Arial,sans-serif`,
      }}
    >
      <StickyLogoNavbar />

      {/* Same width as Profile for alignment */}
      <div className="max-w-4xl mx-auto space-y-6 relative z-10 px-2 sm:px-0 pt-24 pb-10">
        {/* Back button */}
        <div className="flex items-center justify-start">
          <button
            onClick={() => navigate(-1)}
            className="font-semibold rounded-md border border-purple-100 flex items-center gap-2 shadow hover:bg-purple-50 px-3 py-2 text-base transition"
            style={{
              minWidth: 44,
              minHeight: 44,
              background: "rgba(255,255,255,0.88)",
              color: "#6214a8",
              backdropFilter: "blur(6px)",
            }}
            aria-label="Back"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>Back</span>
          </button>
        </div>

        <BusinessHeader
          name={business.name}
          city={business.city}
          category={business.category}
          totalReviews={totalReviews}
          referralCount={referralCount}
          onShare={handleShareForBusiness}
        />

        {/* Analytics */}
        <div className="w-full mt-2 mb-4 sm:mb-8 grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8">
          <MostMentionedWordsCard reviews={business.reviews} />
          <RightAnalyticsTabs
            numReviewers={referralMeta.numReviewers}
            sentimentScore={sentimentScore}
          />
        </div>

        {/* Tab switcher: Reviews / Decision Timeline */}
        <div
          className="rounded-2xl p-4"
          style={{ background: "transparent", borderColor: "transparent" }}
        >
          <div className="flex gap-6 mb-6 text-base font-semibold border-b border-white/30">
            <button
              className={`pb-2 -mb-[2px] px-1 transition ${
                activeTab === "reviews"
                  ? "text-white border-b-2 border-white"
                  : "text-white/50 hover:text-white/80"
              }`}
              onClick={() => setActiveTab("reviews")}
            >
              Reviews
            </button>
            <button
              className={`pb-2 -mb-[2px] px-1 transition ${
                activeTab === "timeline"
                  ? "text-white border-b-2 border-white"
                  : "text-white/50 hover:text-white/80"
              }`}
              onClick={() => setActiveTab("timeline")}
            >
              Decision Timeline
            </button>
          </div>

          {/* ========= Reviews tab (unchanged) ========= */}
          {activeTab === "reviews" && (
            <>
              {loading ? (
                <div className="text-center text-white/80 py-8">Loading reviews…</div>
              ) : business.reviews.length === 0 ? (
                <div className="text-center text-white/90 py-8">
                  No reviews found for this business.
                </div>
              ) : (
                <>
                  <div className="space-y-7">
                    {(showAllReviews ? business.reviews : business.reviews.slice(0, 5)).map(
                      (review, idx) => (
                        <ReviewCard key={idx} review={review} />
                      )
                    )}
                  </div>
                  {business.reviews.length > 5 && (
                    <div className="flex justify-center mt-6">
                      <button
                        className="px-5 py-2 rounded-lg bg-white/15 text-white font-bold hover:bg-white/25 shadow transition"
                        onClick={() => setShowAllReviews((prev) => !prev)}
                      >
                        {showAllReviews ? "Show Less" : "Load More Reviews"}
                      </button>
                    </div>
                  )}
                </>
              )}
            </>
          )}

          {/* ========= Decision Timeline tab ========= */}
          {activeTab === "timeline" && (
            <div className="bg-gray-50 rounded-2xl p-5">
              <DecisionTimeline
                reviews={business.reviews}
                loading={loading}
              />
            </div>
          )}
        </div>
      </div>

      {/* Page background */}
      <style>{`
        body { background: #6214a8 !important; font-family: 'Inter','Poppins','Segoe UI',Arial,sans-serif !important; }
      `}</style>
    </div>
  );
};

export default BusinessPage;
