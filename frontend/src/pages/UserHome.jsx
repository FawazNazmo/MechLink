// frontend/src/pages/UserHome.jsx
import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api, getToken } from "../utils/api";
import Modal from "../Components/Modal";
import FeatureCard from "../Components/FeatureCard";

/* ✅ Chat Icon */
function ChatIcon({ size = 22 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path
        d="M21 12c0 4.418-4.03 8-9 8a10.6 10.6 0 0 1-2.2-.23L3 21l1.6-4.2A7.3 7.3 0 0 1 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M8 12h.01M12 12h.01M16 12h.01"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
      />
    </svg>
  );
}

/* ---------- LOCAL TRIAGE RULES (Symptom → Issue → Urgency) ---------- */
const TRIAGE_RULES = [
  {
    id: "brake_squeal",
    keywords: ["brake", "squeak", "squealing", "screech"],
    likelyIssue: "Brake pad wear or rotor issue",
    urgency: "HIGH",
    advice:
      "Avoid high speeds and hard braking. Book a brake inspection as soon as possible.",
  },
  {
    id: "engine_overheat",
    keywords: ["overheat", "overheating", "smoke", "steam", "temperature high"],
    likelyIssue: "Engine overheating / coolant issue",
    urgency: "CRITICAL",
    advice: "Stop driving immediately and request breakdown support.",
  },
  {
    id: "pulling_side",
    keywords: ["pulling", "pulls", "alignment", "steering off"],
    likelyIssue: "Wheel alignment or tyre pressure issue",
    urgency: "MEDIUM",
    advice:
      "Drive carefully and avoid long journeys. Book an alignment and tyre check.",
  },
  {
    id: "starting_issue",
    keywords: ["won't start", "no start", "clicking", "battery"],
    likelyIssue: "Battery or starter motor problem",
    urgency: "MEDIUM",
    advice:
      "Check the battery first. If stranded, request breakdown assistance or book a diagnostic check with a mechanic.",
  },
];

function runTriage(description = "") {
  const text = description.toLowerCase();
  const matches = [];

  TRIAGE_RULES.forEach((rule) => {
    const hit = rule.keywords.some((k) => text.includes(k.toLowerCase()));
    if (hit) {
      matches.push({
        likelyIssue: rule.likelyIssue,
        urgency: rule.urgency,
        advice: rule.advice,
      });
    }
  });

  if (matches.length === 0) {
    matches.push({
      likelyIssue: "Unknown issue",
      urgency: "UNKNOWN",
      advice:
        "We cannot classify this symptom. If you feel unsafe, raise a breakdown token. Otherwise, book a diagnostic check with a mechanic.",
    });
  }

  return matches;
}

/* ---------- HEALTH SCORE based on service history ---------- */
function computeHealthFromHistory(records = []) {
  if (!Array.isArray(records) || records.length === 0) {
    return {
      score: 60,
      recommendations: [
        "No previous service records in MechLink.",
        "Add your last service visit so the system can give better health estimates.",
      ],
    };
  }

  const today = new Date();
  let lastService = null;
  let overdueServices = 0;

  records.forEach((h) => {
    if (h.date) {
      const d = new Date(h.date);
      if (!lastService || d > lastService) lastService = d;
    }
    if (h.nextServiceDate) {
      const due = new Date(h.nextServiceDate);
      if (due < today) overdueServices += 1;
    }
  });

  const daysSinceLast =
    lastService != null ? Math.round((today - lastService) / 86400000) : 365;

  const penaltyLastService = Math.min(Math.floor(daysSinceLast / 30) * 3, 40);
  const penaltyOverdue = Math.min(overdueServices * 10, 30);
  const penaltySparseHistory = records.length === 1 ? 10 : 0;

  let score = 100 - (penaltyLastService + penaltyOverdue + penaltySparseHistory);
  if (score < 0) score = 0;
  if (score > 100) score = 100;

  const recommendations = [];

  if (!lastService) {
    recommendations.push(
      "No last service date recorded. Consider adding your recent service visit."
    );
  } else if (daysSinceLast > 365) {
    recommendations.push(
      "Last recorded service was over a year ago. A full service is recommended."
    );
  } else if (daysSinceLast > 180) {
    recommendations.push(
      "Last recorded service was over 6 months ago. Consider a routine check."
    );
  } else {
    recommendations.push(
      "Last recorded service is relatively recent. Keep up regular maintenance."
    );
  }

  if (overdueServices > 0) {
    recommendations.push(
      `${overdueServices} maintenance item(s) appear overdue based on previous next service dates.`
    );
  }

  if (score >= 80) {
    recommendations.push(
      "Vehicle health appears good. Continue following manufacturer intervals."
    );
  } else if (score >= 60) {
    recommendations.push(
      "Vehicle health is moderate. Plan a service within the next month."
    );
  } else {
    recommendations.push(
      "Vehicle health is low. Avoid long trips and book a mechanic soon."
    );
  }

  return { score, recommendations };
}

/* ---------- SERVICE SPEND ANALYTICS from history ---------- */
function computeSpendStats(records = []) {
  if (!Array.isArray(records) || records.length === 0) {
    return {
      totalAll: 0,
      total12: 0,
      avgPerVisit: 0,
      visits: 0,
      topServices: [],
    };
  }

  const now = new Date();
  const yearMs = 365 * 86400000;

  let totalAll = 0;
  let total12 = 0;
  let visits = 0;
  const perService = {};

  records.forEach((r) => {
    const rawCost =
      typeof r.cost === "number"
        ? r.cost
        : r.cost != null
        ? Number(r.cost)
        : 0;
    const cost = isNaN(rawCost) ? 0 : rawCost;

    totalAll += cost;
    visits += 1;

    const name = r.service || "Service";
    if (!perService[name]) perService[name] = { count: 0, cost: 0 };
    perService[name].count += 1;
    perService[name].cost += cost;

    if (r.date) {
      const d = new Date(r.date);
      if (!isNaN(d) && now - d <= yearMs) {
        total12 += cost;
      }
    }
  });

  const avgPerVisit =
    visits > 0 ? Math.round((totalAll / visits) * 100) / 100 : 0;

  const topServices = Object.entries(perService)
    .sort((a, b) => b[1].cost - a[1].cost)
    .slice(0, 3)
    .map(([name, info]) => ({
      name,
      count: info.count,
      cost: Math.round(info.cost * 100) / 100,
    }));

  return { totalAll, total12, avgPerVisit, visits, topServices };
}

/* ---------- Build MOT / insurance / tax alerts from dates ---------- */
function buildLegalAlerts(profile) {
  const now = new Date();
  const list = [];

  const add = (label, dateStr) => {
    if (!dateStr) return;
    const d = new Date(dateStr);
    if (isNaN(d)) return;
    const diffDays = Math.round((d - now) / 86400000);
    if (diffDays < 0) {
      list.push({
        id: label,
        message: `${label} expired on ${d.toLocaleDateString()}.`,
      });
    } else if (diffDays <= 30) {
      list.push({
        id: label,
        message: `${label} expires on ${d.toLocaleDateString()} (in ${diffDays} day${
          diffDays === 1 ? "" : "s"
        }).`,
      });
    }
  };

  add("MOT", profile.motExpiry);
  add("Insurance", profile.insuranceExpiry);
  add("Road tax", profile.taxExpiry);

  return list;
}

/* ---------- Mechanic match score: rating + distance ---------- */
function getMatchScore(mechanic, ratingsMap) {
  const stat = ratingsMap[mechanic.id];
  const rating = typeof stat?.avg === "number" ? stat.avg : 3;
  const normRating = rating / 5;

  const d = mechanic.distanceKm;
  const normDistance =
    typeof d === "number" ? 1 - Math.min(d / 50, 1) : 0.5;

  const score = 0.7 * normRating + 0.3 * normDistance;
  return Math.round(score * 100);
}

/* ---------------- DEMO deposit (no Stripe) ---------------- */
function DemoDepositForm({ mechanic, bookingId, onDone, onError }) {
  const [cardRaw, setCardRaw] = useState("");
  const [expView, setExpView] = useState("");
  const [cvc, setCvc] = useState("");
  const [busy, setBusy] = useState(false);

  const formatCard = (digits) => digits.replace(/(\d{4})(?=\d)/g, "$1 ").trim();

  const handleCardChange = (e) => {
    const digits = e.target.value.replace(/\D/g, "").slice(0, 16);
    setCardRaw(digits);
  };

  const handleExpChange = (e) => {
    const digits = e.target.value.replace(/\D/g, "").slice(0, 4);
    if (digits.length <= 2) setExpView(digits);
    else setExpView(`${digits.slice(0, 2)}/${digits.slice(2)}`);
  };

  const handleCvcChange = (e) => {
    const digits = e.target.value.replace(/\D/g, "").slice(0, 4);
    setCvc(digits);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const expOK = /^\d{2}\/\d{2}$/.test(expView);
    if (cardRaw.length !== 16) return onError("Please enter 16 digits for the card.");
    if (!expOK) return onError("Expiry must be in MM/YY format.");
    if (!(cvc.length === 3 || cvc.length === 4)) return onError("CVC must be 3–4 digits.");

    try {
      setBusy(true);
      setTimeout(() => {
        onDone();
        setBusy(false);
      }, 500);
    } catch (err) {
      onError(err.message || "Payment error");
      setBusy(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="grid gap-3">
      <div className="text-sm text-gray-300">
        Paying a <span className="font-semibold">£10 </span> deposit to reserve{" "}
        <span className="font-semibold">{mechanic?.name || "mechanic"}</span>.
      </div>

      <label className="text-sm text-gray-300">
        Card number
        <input
          inputMode="numeric"
          autoComplete="cc-number"
          placeholder="1234 5678 9012 3456"
          value={formatCard(cardRaw)}
          onChange={handleCardChange}
          className="mt-1 w-full bg-neutral-800 border border-white/10 rounded px-3 py-2 tracking-widest"
        />
      </label>

      <div className="grid grid-cols-2 gap-3">
        <label className="text-sm text-gray-300">
          Expiry (MM/YY)
          <input
            inputMode="numeric"
            autoComplete="cc-exp"
            placeholder="12/30"
            value={expView}
            onChange={handleExpChange}
            className="mt-1 w-full bg-neutral-800 border border-white/10 rounded px-3 py-2"
          />
        </label>
        <label className="text-sm text-gray-300">
          CVC
          <input
            inputMode="numeric"
            autoComplete="cc-csc"
            placeholder="123"
            value={cvc}
            onChange={handleCvcChange}
            className="mt-1 w-full bg-neutral-800 border border-white/10 rounded px-3 py-2"
          />
        </label>
      </div>

      <div className="flex justify-end gap-3">
        <button
          type="submit"
          disabled={busy}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded"
        >
          {busy ? "Processing…" : "Pay £10 Deposit"}
        </button>
      </div>
    </form>
  );
}

/* --------- Simple Toast (mechanic accepted token) --------- */
function Toast({ open, onClose, children }) {
  useEffect(() => {
    if (!open) return;
    const t = setTimeout(onClose, 5000);
    return () => clearTimeout(t);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
      <div className="bg-black/80 text-white border border-white/15 rounded-xl px-4 py-3 shadow-xl backdrop-blur">
        {children}
      </div>
    </div>
  );
}

/* ---------- Helpers: mechanic contact ---------- */
function safeEmail(m) {
  return m?.email || m?.mail || "";
}
function safePhone(m) {
  return m?.phone || m?.phoneNumber || m?.mobile || m?.mobileNumber || "";
}

/* --------------------------- USER HOME --------------------------- */
export default function UserHome() {
  const navigate = useNavigate();
  const token = getToken();

  const [me, setMe] = useState(null);
  const [initialized, setInitialized] = useState(false);

  const [showWelcome, setShowWelcome] = useState(false);
  const [statusMsg, setStatusMsg] = useState("");

  // Modals
  const [bookOpen, setBookOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [alertsOpen, setAlertsOpen] = useState(false);
  const [depositOpen, setDepositOpen] = useState(false);
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [symptomOpen, setSymptomOpen] = useState(false);

  // ✅ Mechanic details popup
  const [mechDetailsOpen, setMechDetailsOpen] = useState(false);
  const [mechDetailsFor, setMechDetailsFor] = useState(null);

  // Symptom advisor
  const [symptomText, setSymptomText] = useState("");
  const [triageResults, setTriageResults] = useState([]);

  // Data
  const [mechanics, setMechanics] = useState([]);
  const [serviceHistory, setServiceHistory] = useState([]);
  const [alerts, setAlerts] = useState([]);

  // Health score & recommendations
  const [healthScore, setHealthScore] = useState(null);
  const [healthSummary, setHealthSummary] = useState([]);

  // Spend analytics
  const [spendStats, setSpendStats] = useState(null);

  // MOT / insurance / tax reminders (localStorage only)
  const [legalProfile, setLegalProfile] = useState({
    registration: "",
    motExpiry: "",
    insuranceExpiry: "",
    taxExpiry: "",
  });
  const [legalAlerts, setLegalAlerts] = useState([]);

  // Ratings cache { [mechanicId]: { avg, count } }
  const [mechRatings, setMechRatings] = useState({});

  // Latest breakdown token
  const [latestToken, setLatestToken] = useState(null);
  const lastTokenIdRef = useRef(null);

  // remember which token we've already shown “accepted” toast for
  const acceptedToastForRef = useRef(null);
  const [toastOpen, setToastOpen] = useState(false);
  const [toastMsg, setToastMsg] = useState("");

  // Booking
  const [selectedMech, setSelectedMech] = useState(null);
  const [issue, setIssue] = useState("General issue");
  const [dateStr, setDateStr] = useState("");
  const [timeStr, setTimeStr] = useState("");
  const [pendingBookingId, setPendingBookingId] = useState(null);

  // Feedback (post-job)
  const [pendingFeedback, setPendingFeedback] = useState([]);
  const [activeFeedback, setActiveFeedback] = useState(null);
  const [ratingValue, setRatingValue] = useState(5);
  const [comment, setComment] = useState("");

  // Mechanic feedback viewer modal
  const [reviewOpen, setReviewOpen] = useState(false);
  const [reviewLoading, setReviewLoading] = useState(false);
  const [reviewFor, setReviewFor] = useState(null); // { id, name }
  const [reviewData, setReviewData] = useState({ items: [] });

  /* ---------------- INIT ---------------- */
  useEffect(() => {
    if (!token) {
      navigate("/login?type=user", { replace: true });
      return;
    }

    // Load MOT/insurance/tax profile from localStorage
    try {
      const raw = localStorage.getItem("ml_legal_profile");
      if (raw) {
        const parsed = JSON.parse(raw);
        setLegalProfile((prev) => ({ ...prev, ...parsed }));
        setLegalAlerts(buildLegalAlerts(parsed));
      }
    } catch (e) {
      console.warn("legal profile load error:", e);
    }

    let cancelled = false;

    (async () => {
      try {
        const { user } = await api("/api/auth/me");
        if (cancelled) return;
        setMe(user);
        if (localStorage.getItem("ml_welcome") === "1") {
          setShowWelcome(true);
          localStorage.removeItem("ml_welcome");
        }
        await pollLatestToken();
        await loadPendingFeedback();
      } catch (err) {
        if (!cancelled) setStatusMsg(err.message || "Failed to load profile");
      } finally {
        if (!cancelled) setInitialized(true);
      }
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, navigate]);

  /* -------------- TOKEN POLLING -------------- */
  const maybeShowAcceptedToast = (tokenObj) => {
    if (!tokenObj) return;

    const { status, mechanic, _id } = tokenObj;
    if (status !== "accepted") return;
    if (!_id) return;

    if (acceptedToastForRef.current === _id) return;

    const mechName =
      mechanic?.firstName && mechanic?.lastName
        ? `${mechanic.firstName} ${mechanic.lastName}`
        : mechanic?.firstName || mechanic?.username || "Your mechanic";

    setToastMsg(
      `${mechName} accepted your breakdown request and will arrive in several minutes.`
    );
    setToastOpen(true);
    acceptedToastForRef.current = _id;
  };

  const pollLatestToken = async () => {
    try {
      const res = await api("/api/tokens/my-latest");
      const t = res.token || null;
      setLatestToken(t);

      if (t && t._id !== lastTokenIdRef.current) {
        lastTokenIdRef.current = t._id;
        acceptedToastForRef.current = null;
      }

      if (t) maybeShowAcceptedToast(t);
    } catch (err) {
      console.warn("latest token error:", err.message);
    }
  };

  useEffect(() => {
    if (!initialized) return;
    const id = setInterval(pollLatestToken, 8000);
    return () => clearInterval(id);
  }, [initialized]);

  const logout = () => {
    localStorage.clear();
    navigate("/", { replace: true });
  };

  /* -------------- BREAKDOWN TOKEN -------------- */
  const raiseBreakdown = () => {
    setStatusMsg("");
    if (!navigator.geolocation) {
      setStatusMsg("Geolocation not supported by your browser.");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const lat = Number(pos.coords.latitude);
          const lng = Number(pos.coords.longitude);
          const { token: t } = await api("/api/tokens/raise", {
            method: "POST",
            body: { lat, lng, note: "Breakdown assistance" },
          });
          setLatestToken(t);
          lastTokenIdRef.current = t?._id || null;
          acceptedToastForRef.current = null;
          setStatusMsg("Breakdown token raised. Nearby mechanics will be notified.");
        } catch (err) {
          setStatusMsg(err.message || "Failed to raise token.");
        }
      },
      () =>
        setStatusMsg(
          "Location permission denied. Please enable it in your browser and try again."
        )
    );
  };

  /* -------------- NEARBY MECHANICS + RATINGS -------------- */
  const loadNearbyMechanics = () => {
    setMechanics([]);
    setMechRatings({});
    setStatusMsg("");
    if (!navigator.geolocation) {
      setStatusMsg("Geolocation not supported by your browser.");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const lat = Number(pos.coords.latitude);
          const lng = Number(pos.coords.longitude);
          const res = await api(
            `/api/mechanics/nearby?lat=${lat}&lng=${lng}&radius=50`
          );

          const raw = res.mechanics || res.items || [];
          const mapped = raw.map((m) => {
            const id = m.id || m._id;

            const name =
              m.name ||
              m.garageName ||
              `${m.firstName || ""}${m.lastName ? ` ${m.lastName}` : ""}`.trim() ||
              m.username ||
              "Mechanic";

            const garageName = m.garageName || m.name || "";
            const address =
              m.address ||
              m.garageAddress ||
              m.garage_location ||
              m.location?.city ||
              "";

            const email = safeEmail(m);
            const phone = safePhone(m);

            const distanceKm =
              typeof m.distanceKm === "number"
                ? m.distanceKm
                : typeof m.distance_km === "number"
                ? m.distance_km
                : null;

            return {
              id,
              name,
              garageName,
              address: address || "",
              email,
              phone,
              schedule: m.schedule || null,
              distanceKm,
            };
          });

          setMechanics(mapped);

          const entries = await Promise.all(
            mapped.map(async (m) => {
              try {
                const s = await api(`/api/feedback/summary/${m.id}`);
                return [m.id, { avg: s.avg, count: s.count }];
              } catch {
                return [m.id, { avg: null, count: 0 }];
              }
            })
          );
          setMechRatings(Object.fromEntries(entries));
        } catch (err) {
          console.error("nearby mechanics error:", err);
          setStatusMsg(err.message || "Failed to load mechanics.");
        }
      },
      () =>
        setStatusMsg(
          "Location permission denied. Please enable it in your browser and try again."
        )
    );
  };

  /* -------------- SERVICE HISTORY -------------- */
  const loadServiceHistory = async () => {
    try {
      const res = await api("/api/history");
      setServiceHistory(
        (res.items || []).map((h, i) => ({
          id: i + 1,
          mechanic: h.mechanic,
          date: h.date ? String(h.date).slice(0, 10) : "",
          issue: h.service,
          status: "Completed",
          fairFlag: h.fairFlag || "unknown",
          isReturnVisit: !!h.isReturnVisit,
        }))
      );
    } catch (err) {
      console.error("history error:", err);
      setServiceHistory([]);
    }
  };

  /* -------------- HEALTH SCORE + MAINTENANCE ALERTS + SPEND ANALYTICS -------------- */
  const loadAlerts = async () => {
    try {
      const res = await api("/api/history");
      const items = res.items || [];
      const today = new Date();
      const upcoming = [];

      items.forEach((h, idx) => {
        if (h.nextServiceDate) {
          const due = new Date(h.nextServiceDate);
          const diffDays = Math.round((due - today) / 86400000);
          if (diffDays >= 0 && diffDays <= 30) {
            upcoming.push({
              id: h.id || idx,
              message: `Upcoming service "${h.service}" around ${due.toLocaleDateString()}`,
              date: due.toISOString().slice(0, 10),
            });
          }
        }
      });

      setAlerts(upcoming);

      const { score, recommendations } = computeHealthFromHistory(items);
      setHealthScore(score);
      setHealthSummary(recommendations);

      const spend = computeSpendStats(items);
      setSpendStats(spend);

      setLegalAlerts(buildLegalAlerts(legalProfile));
    } catch (err) {
      console.error("alerts/health error:", err);
      setAlerts([]);
      setHealthScore(null);
      setHealthSummary([]);
      setSpendStats(null);
    }
  };

  /* -------------- PENDING FEEDBACK -------------- */
  const loadPendingFeedback = async () => {
    try {
      const res = await api("/api/feedback/pending");
      const pending = res.pending || [];
      setPendingFeedback(pending);
      if (pending.length > 0) {
        setActiveFeedback(pending[0]);
        setRatingValue(5);
        setComment("");
        setFeedbackOpen(true);
      }
    } catch (err) {
      console.warn("pending feedback error:", err.message);
    }
  };

  const submitFeedback = async (e) => {
    e.preventDefault();
    if (!activeFeedback) return;

    const mech =
      typeof activeFeedback.mechanic === "string"
        ? activeFeedback.mechanic
        : activeFeedback.mechanic?._id;

    if (!mech) {
      alert("Mechanic id missing for this feedback item.");
      return;
    }

    try {
      await api("/api/feedback", {
        method: "POST",
        body: {
          mechanicId: mech,
          rating: ratingValue,
          comment,
          sourceType: activeFeedback.type,
          sourceId: activeFeedback._id,
        },
      });

      const remaining = pendingFeedback.filter(
        (p) => p._id !== activeFeedback._id
      );
      setPendingFeedback(remaining);
      if (remaining.length > 0) {
        setActiveFeedback(remaining[0]);
        setRatingValue(5);
        setComment("");
      } else {
        setFeedbackOpen(false);
        setActiveFeedback(null);
      }
    } catch (err) {
      alert(err.message || "Failed to submit feedback");
    }
  };

  /* -------------- BOOKING -------------- */
  const submitBooking = async (e) => {
    e.preventDefault();
    if (!selectedMech) return alert("Select a mechanic first.");
    if (!dateStr || !timeStr) return alert("Pick a date and time.");

    try {
      const ck = await api("/api/bookings/check", {
        method: "POST",
        body: { mechanicId: selectedMech.id, date: dateStr, time: timeStr },
      });
      if (!ck.ok) return alert(ck.reason || "Slot not available");

      const { booking } = await api("/api/bookings", {
        method: "POST",
        body: {
          mechanicId: selectedMech.id,
          issue: issue || "General issue",
          preferredDate: dateStr,
          preferredTime: timeStr,
          notes: "",
        },
      });

      setPendingBookingId(booking._id);
      setDepositOpen(true);
    } catch (err) {
      alert(err.message || "Failed to book mechanic");
    }
  };

  const onDepositDone = () => {
    setDepositOpen(false);
    setBookOpen(false);
    setSelectedMech(null);
    setDateStr("");
    setTimeStr("");
    alert("Deposit recorded. Your booking has been reserved!");
  };

  /* -------------- MECHANIC FEEDBACK VIEWER -------------- */
  const openMechanicFeedback = async (mech) => {
    setReviewFor({ id: mech.id, name: mech.name });
    setReviewLoading(true);
    setReviewData({ items: [] });
    setReviewOpen(true);
    try {
      const res = await api(`/api/feedback/mechanic/${mech.id}`);
      setReviewData({ items: res.items || [] });
    } catch (err) {
      setReviewData({ items: [] });
    } finally {
      setReviewLoading(false);
    }
  };

  /* ✅ MECHANIC DETAILS POPUP */
  const openMechanicDetails = (mech) => {
    setMechDetailsFor(mech);
    setMechDetailsOpen(true);
  };

  /* -------------- SYMPTOM ADVISOR -------------- */
  const runSymptomAnalyse = () => {
    const trimmed = symptomText.trim();
    if (!trimmed) {
      setTriageResults([]);
      return;
    }
    const result = runTriage(trimmed);
    setTriageResults(result);
  };

  const name = me?.firstName || "User";

  if (!initialized) {
    return (
      <div
        className="min-h-screen flex items-center justify-center text-white"
        style={{
          backgroundImage: "url('/images/Home-Bg.png')",
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        <div className="bg-black/60 px-6 py-3 rounded-xl border border-white/10">
          Loading…
        </div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen flex flex-col justify-between text-white font-lexend"
      style={{
        backgroundImage: "url('/images/Home-Bg.png')",
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
    >
      {/* Header */}
      <header className="bg-black/50 p-6 flex justify-between items-center">
        <h1 className="text-3xl font-bold">MechLink — Vehicle User Dashboard</h1>
        <button
          onClick={logout}
          className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg"
        >
          Logout
        </button>
      </header>

      {/* Main */}
      <main className="flex-grow flex flex-col items-center py-10">
        {showWelcome && (
          <div className="mb-5 bg-blue-700/85 border border-white/10 px-6 py-3 rounded-xl shadow">
            Welcome, {name}.
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-11/12 md:w-3/4">
          <FeatureCard
            title="Raise Breakdown Token"
            subtitle="If your vehicle breaks down, alert nearby mechanics instantly."
            onClick={raiseBreakdown}
          />
          <FeatureCard
            title="Book a Mechanic"
            subtitle="Find nearby mechanics and reserve a slot (£10 deposit)."
            onClick={() => {
              setBookOpen(true);
              loadNearbyMechanics();
            }}
          />
          <FeatureCard
            title="Service History"
            subtitle="Check your previous bookings and mechanic visits."
            onClick={() => {
              setHistoryOpen(true);
              loadServiceHistory();
            }}
          />
          <FeatureCard
            title="Vehicle Health & Alerts"
            subtitle="See your vehicle health, costs and legal reminders."
            onClick={() => {
              setAlertsOpen(true);
              loadAlerts();
            }}
          />
          <FeatureCard
            title="Symptom Advisor"
            subtitle="Describe strange noises or behaviour and get urgency guidance."
            onClick={() => {
              setSymptomText("");
              setTriageResults([]);
              setSymptomOpen(true);
            }}
          />
        </div>

        {statusMsg && (
          <p className="mt-6 text-gray-300 bg-black/60 px-4 py-2 rounded-xl border border-white/10">
            {statusMsg}
          </p>
        )}

        {latestToken && (
          <p className="mt-4 text-sm bg-black/70 px-4 py-2 rounded-xl border border-white/10">
            Latest breakdown token status: {latestToken.status}
          </p>
        )}
      </main>

      <footer className="bg-black/50 text-center py-4 text-gray-300 text-sm">
        © 2025 MechLink
      </footer>

      {/* Book Modal */}
      <Modal open={bookOpen} onClose={() => setBookOpen(false)} title="Available Mechanics">
        {mechanics.length === 0 ? (
          <p className="text-gray-300">
            No mechanics nearby (or location access blocked).
          </p>
        ) : (
          <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
            {mechanics.map((m) => {
              const stat = mechRatings[m.id];
              const hasRating = stat && typeof stat.avg === "number";
              const matchScore = getMatchScore(m, mechRatings);

              return (
                <div
                  key={m.id}
                  className="bg-neutral-800/60 border border-white/10 rounded-xl p-4"
                >
                  <div className="flex justify-between items-start gap-3">
                    <div>
                      <h3 className="text-lg font-semibold">{m.name}</h3>
                      <div className="text-gray-300 text-sm">
                        <span className="font-semibold">Address:</span>{" "}
                        {m.address || "—"}
                      </div>
                      {typeof m.distanceKm === "number" && (
                        <div className="text-xs text-gray-400 mt-1">
                          ~{m.distanceKm.toFixed(1)} km away
                        </div>
                      )}
                    </div>

                    <div className="text-right text-sm space-y-1">
                      <div className="inline-block bg-black/40 border border-white/10 rounded px-2 py-0.5">
                        {hasRating ? (
                          <span className="whitespace-nowrap">
                            {stat.avg.toFixed(1)}★{" "}
                            <span className="text-gray-400">({stat.count})</span>
                          </span>
                        ) : (
                          <span className="text-gray-400">No ratings</span>
                        )}
                      </div>

                      <div className="text-xs text-emerald-300">
                        Match score:{" "}
                        <span className="font-semibold">{matchScore}</span>/100
                      </div>
                    </div>
                  </div>

                  {m.schedule && (
                    <div className="mt-2">
                      <h4 className="font-semibold text-gray-200 mb-1">
                        Weekly Availability
                      </h4>
                      <table className="w-full text-sm border border-white/10 rounded">
                        <tbody>
                          {Object.entries(m.schedule).map(([day, cfg]) => (
                            <tr key={day} className="border-b border-white/10">
                              <td className="capitalize py-1 px-2">{day}</td>
                              <td className="py-1 px-2">
                                {cfg.on ? `${cfg.start} - ${cfg.end}` : "Unavailable"}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="mt-3 flex items-center justify-between">
                    <button
                      className={`px-3 py-1 rounded ${
                        selectedMech?.id === m.id
                          ? "bg-green-700"
                          : "bg-blue-600 hover:bg-blue-700"
                      }`}
                      onClick={() => setSelectedMech(m)}
                    >
                      {selectedMech?.id === m.id ? "Selected" : "Select"}
                    </button>

                    {/* ✅ Chat + Mechanic details + View feedback */}
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        title="Mechanic details"
                        className="px-3 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-sm"
                        onClick={() => openMechanicDetails(m)}
                      >
                        Mechanic details
                      </button>

                      <button
                        type="button"
                        title="Chat with mechanic"
                        className="w-10 h-10 rounded-xl bg-white/10 hover:bg-white/15 flex items-center justify-center"
                        onClick={() => {
                          setBookOpen(false);
                          navigate(`/chat/${m.id}`, { state: { otherName: m.name } });
                        }}
                      >
                        <ChatIcon />
                      </button>

                      <button
                        type="button"
                        onClick={() => openMechanicFeedback(m)}
                        className="text-sm underline"
                      >
                        View feedback
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Booking form */}
            <form
              className="bg-neutral-900 border border-white/10 rounded-xl p-4"
              onSubmit={submitBooking}
            >
              <div className="text-sm text-gray-300 mb-2">Booking details</div>

              {/* ✅ Show selected mechanic + details popup */}
              <div className="flex items-center justify-between mb-2">
                <div className="text-sm text-gray-200">
                  <span className="font-semibold">Selected mechanic:</span>{" "}
                  {selectedMech ? selectedMech.name : "—"}
                </div>
                {selectedMech && (
                  <button
                    type="button"
                    className="text-sm underline"
                    onClick={() => openMechanicDetails(selectedMech)}
                  >
                    Mechanic details
                  </button>
                )}
              </div>

              <label className="block text-sm text-gray-300 mb-2">
                Describe issue
                <input
                  value={issue}
                  onChange={(e) => setIssue(e.target.value)}
                  className="mt-1 w-full bg-neutral-800 border border-white/10 rounded px-3 py-2"
                  placeholder="E.g., engine noise, no start, etc."
                />
              </label>

              <div className="grid grid-cols-2 gap-3">
                <label className="text-sm text-gray-300">
                  Date
                  <input
                    type="date"
                    value={dateStr}
                    onChange={(e) => setDateStr(e.target.value)}
                    className="mt-1 w-full bg-neutral-800 border border-white/10 rounded px-3 py-2"
                    required
                  />
                </label>
                <label className="text-sm text-gray-300">
                  Time
                  <input
                    type="time"
                    value={timeStr}
                    onChange={(e) => setTimeStr(e.target.value)}
                    className="mt-1 w-full bg-neutral-800 border border-white/10 rounded px-3 py-2"
                    required
                  />
                </label>
              </div>

              <div className="flex justify-end mt-3">
                <button
                  type="submit"
                  className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded"
                >
                  Continue to £10 deposit
                </button>
              </div>
            </form>
          </div>
        )}
      </Modal>

      {/* ✅ Mechanic Details Modal */}
      <Modal
        open={mechDetailsOpen}
        onClose={() => setMechDetailsOpen(false)}
        title="Mechanic details"
      >
        {!mechDetailsFor ? (
          <p className="text-gray-300 text-sm">No mechanic selected.</p>
        ) : (
          <div className="space-y-2 text-sm text-gray-200">
            <div className="bg-neutral-900/80 border border-white/10 rounded-xl p-3">
              <div className="text-gray-200 font-semibold mb-1">
                {mechDetailsFor.garageName || mechDetailsFor.name || "Mechanic"}
              </div>

              <div className="text-gray-300">
                <span className="font-semibold">Garage address:</span>{" "}
                {mechDetailsFor.address || "—"}
              </div>

              <div className="text-gray-300 mt-1">
                <span className="font-semibold">Email:</span>{" "}
                {mechDetailsFor.email ? (
                  <a className="underline" href={`mailto:${mechDetailsFor.email}`}>
                    {mechDetailsFor.email}
                  </a>
                ) : (
                  "—"
                )}
              </div>

              <div className="text-gray-300 mt-1">
                <span className="font-semibold">Phone:</span>{" "}
                {mechDetailsFor.phone ? (
                  <a className="underline" href={`tel:${mechDetailsFor.phone}`}>
                    {mechDetailsFor.phone}
                  </a>
                ) : (
                  "—"
                )}
              </div>

              {typeof mechDetailsFor.distanceKm === "number" && (
                <div className="text-xs text-gray-400 mt-2">
                  Distance: ~{mechDetailsFor.distanceKm.toFixed(1)} km
                </div>
              )}
            </div>
          </div>
        )}
      </Modal>

      {/* Deposit modal (DEMO) */}
      <Modal
        open={depositOpen}
        onClose={() => setDepositOpen(false)}
        title="Pay deposit"
      >
        {!selectedMech || !pendingBookingId ? (
          <p className="text-gray-300">Missing booking details.</p>
        ) : (
          <DemoDepositForm
            mechanic={selectedMech}
            bookingId={pendingBookingId}
            onDone={onDepositDone}
            onError={(m) => alert(m)}
          />
        )}
      </Modal>

      {/* Mechanic Feedback Viewer */}
      <Modal
        open={reviewOpen}
        onClose={() => setReviewOpen(false)}
        title={reviewFor ? `Feedback for ${reviewFor.name}` : "Feedback"}
      >
        {reviewLoading ? (
          <p className="text-gray-300 text-sm">Loading…</p>
        ) : reviewData.items.length === 0 ? (
          <p className="text-gray-300 text-sm">
            No reviews yet for this mechanic.
          </p>
        ) : (
          <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
            {reviewData.items.map((f, idx) => (
              <div
                key={idx}
                className="bg-neutral-800/60 border border-white/10 rounded-xl p-3 text-sm"
              >
                <div className="text-gray-200 font-semibold">
                  {f.userName} — {f.rating}★
                </div>
                {f.comment && (
                  <div className="text-gray-300 mt-1">{f.comment}</div>
                )}
                <div className="text-gray-500 text-xs mt-1">
                  {f.date ? new Date(f.date).toLocaleString() : ""}
                </div>
              </div>
            ))}
          </div>
        )}
      </Modal>

      {/* History modal */}
      <Modal
        open={historyOpen}
        onClose={() => setHistoryOpen(false)}
        title="Service History"
      >
        {serviceHistory.length === 0 ? (
          <p className="text-gray-300">No previous service records.</p>
        ) : (
          <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
            {serviceHistory.map((h) => (
              <div
                key={h.id}
                className="bg-neutral-800/60 border border-white/10 rounded-xl p-3 text-sm"
              >
                <div className="text-gray-200 font-semibold">
                  {h.mechanic} — {h.issue}
                </div>
                <div className="text-gray-400">
                  {h.date} • Status: {h.status}
                </div>

                {h.fairFlag && h.fairFlag !== "unknown" && (
                  <div className="text-xs text-gray-300 mt-1">
                    Price band:{" "}
                    {h.fairFlag === "fair"
                      ? "within the normal range for this type of job."
                      : h.fairFlag === "slightly_high"
                      ? "slightly above the typical range for this job."
                      : h.fairFlag === "high"
                      ? "higher than MechLink’s normal range for this job."
                      : h.fairFlag === "low"
                      ? "lower than expected – make sure the work and parts are genuine."
                      : "no benchmark available."}
                  </div>
                )}

                {h.isReturnVisit && (
                  <div className="text-xs text-amber-300 mt-1">
                    MechLink detected this as a repeat visit for a similar issue
                    within the last 30 days.
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </Modal>

      {/* Vehicle Health + Alerts + Legal Reminders + Spend Analytics */}
      <Modal
        open={alertsOpen}
        onClose={() => setAlertsOpen(false)}
        title="Vehicle Health & Alerts"
      >
        <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1 text-sm">
          {/* Health score */}
          <div className="bg-neutral-900/80 border border-white/10 rounded-xl p-3">
            <div className="flex items-baseline gap-2 mb-1">
              <span className="text-gray-200 font-semibold">Health score:</span>
              {healthScore != null ? (
                <span className="text-xl font-bold text-emerald-300">
                  {healthScore}
                  <span className="text-sm text-gray-400">/100</span>
                </span>
              ) : (
                <span className="text-gray-400">No data</span>
              )}
            </div>
            <ul className="list-disc list-inside text-gray-300 space-y-1">
              {healthSummary.map((r, idx) => (
                <li key={idx}>{r}</li>
              ))}
            </ul>
          </div>

          {/* Upcoming maintenance */}
          <div className="bg-neutral-900/80 border border-white/10 rounded-xl p-3">
            <h4 className="text-gray-200 font-semibold mb-2">
              Upcoming maintenance
            </h4>
            {alerts.length === 0 ? (
              <p className="text-gray-300">
                No upcoming maintenance alerts in the next 30 days.
              </p>
            ) : (
              <div className="space-y-2">
                {alerts.map((a) => (
                  <div
                    key={a.id}
                    className="bg-neutral-800/60 border border-white/10 rounded-xl p-3 text-sm"
                  >
                    <div className="text-gray-200">{a.message}</div>
                    <div className="text-gray-400 text-xs">
                      Target date: {a.date}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* MOT / Insurance / Tax reminders */}
          <div className="bg-neutral-900/80 border border-white/10 rounded-xl p-3">
            <h4 className="text-gray-200 font-semibold mb-2">
              MOT, Insurance & Tax reminders
            </h4>
            <form
              className="grid gap-3 md:grid-cols-2"
              onSubmit={(e) => {
                e.preventDefault();
                try {
                  localStorage.setItem(
                    "ml_legal_profile",
                    JSON.stringify(legalProfile)
                  );
                  setLegalAlerts(buildLegalAlerts(legalProfile));
                  alert("Reminder dates saved on this device.");
                } catch {
                  alert("Failed to save reminder dates.");
                }
              }}
            >
              <label className="text-xs text-gray-300 md:col-span-2">
                Registration number
                <input
                  className="mt-1 w-full bg-neutral-800 border border-white/10 rounded px-3 py-2 text-sm"
                  value={legalProfile.registration}
                  onChange={(e) =>
                    setLegalProfile((p) => ({
                      ...p,
                      registration: e.target.value,
                    }))
                  }
                  placeholder="e.g. AB12 CDE"
                />
              </label>

              <label className="text-xs text-gray-300">
                MOT expiry
                <input
                  type="date"
                  className="mt-1 w-full bg-neutral-800 border border-white/10 rounded px-3 py-2 text-sm"
                  value={legalProfile.motExpiry}
                  onChange={(e) =>
                    setLegalProfile((p) => ({
                      ...p,
                      motExpiry: e.target.value,
                    }))
                  }
                />
              </label>

              <label className="text-xs text-gray-300">
                Insurance expiry
                <input
                  type="date"
                  className="mt-1 w-full bg-neutral-800 border border-white/10 rounded px-3 py-2 text-sm"
                  value={legalProfile.insuranceExpiry}
                  onChange={(e) =>
                    setLegalProfile((p) => ({
                      ...p,
                      insuranceExpiry: e.target.value,
                    }))
                  }
                />
              </label>

              <label className="text-xs text-gray-300">
                Road tax expiry (optional)
                <input
                  type="date"
                  className="mt-1 w-full bg-neutral-800 border border-white/10 rounded px-3 py-2 text-sm"
                  value={legalProfile.taxExpiry}
                  onChange={(e) =>
                    setLegalProfile((p) => ({
                      ...p,
                      taxExpiry: e.target.value,
                    }))
                  }
                />
              </label>

              <div className="flex justify-end items-end md:col-span-2">
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded text-sm"
                >
                  Save reminder dates
                </button>
              </div>
            </form>

            {legalAlerts.length > 0 && (
              <div className="mt-3 space-y-1 text-xs text-amber-300">
                {legalAlerts.map((a, idx) => (
                  <div key={idx}>• {a.message}</div>
                ))}
              </div>
            )}
          </div>

          {/* Service spend analytics */}
          <div className="bg-neutral-900/80 border border-white/10 rounded-xl p-3">
            <h4 className="text-gray-200 font-semibold mb-2">
              Service spend overview
            </h4>
            {!spendStats || spendStats.visits === 0 ? (
              <p className="text-gray-300">
                No cost data yet. Once mechanics record service costs, MechLink
                will show your spending insights here.
              </p>
            ) : (
              <>
                <div className="flex flex-wrap gap-4 text-sm text-gray-200 mb-2">
                  <div>
                    <div className="text-xs text-gray-400">Total visits</div>
                    <div className="font-semibold">{spendStats.visits}</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-400">
                      Total spend (all time)
                    </div>
                    <div className="font-semibold">
                      £{spendStats.totalAll.toFixed(2)}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-400">Last 12 months</div>
                    <div className="font-semibold">
                      £{spendStats.total12.toFixed(2)}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-400">Average per visit</div>
                    <div className="font-semibold">
                      £{spendStats.avgPerVisit.toFixed(2)}
                    </div>
                  </div>
                </div>

                {spendStats.topServices.length > 0 && (
                  <>
                    <div className="text-xs text-gray-400 mb-1">
                      Top services by spend:
                    </div>
                    <ul className="list-disc list-inside text-gray-300 text-sm space-y-1">
                      {spendStats.topServices.map((s) => (
                        <li key={s.name}>
                          {s.name}: {s.count} visit(s), £{s.cost.toFixed(2)} total
                        </li>
                      ))}
                    </ul>
                  </>
                )}
              </>
            )}
          </div>
        </div>
      </Modal>

      {/* Symptom Advisor modal */}
      <Modal
        open={symptomOpen}
        onClose={() => setSymptomOpen(false)}
        title="Symptom Advisor"
      >
        <div className="space-y-3 text-sm text-gray-200">
          <p className="text-gray-300">
            Describe what your car is doing (e.g. “brakes squealing when I stop”,
            “car pulls to the left”, “smoke from bonnet”). MechLink will give a rough
            idea of urgency.
          </p>

          <textarea
            rows={3}
            value={symptomText}
            onChange={(e) => setSymptomText(e.target.value)}
            className="w-full bg-neutral-800 border border-white/10 rounded px-3 py-2"
            placeholder="Type your symptom here…"
          />

          <div className="flex justify-end">
            <button
              type="button"
              onClick={runSymptomAnalyse}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded"
            >
              Analyse
            </button>
          </div>

          {triageResults.length > 0 && (
            <div className="space-y-2 mt-2">
              {triageResults.map((t, idx) => (
                <div
                  key={idx}
                  className="bg-neutral-900 border border-white/10 rounded-xl p-3 text-sm"
                >
                  <div className="text-gray-200 font-semibold">
                    Likely issue: {t.likelyIssue}
                  </div>
                  <div className="text-xs text-gray-400 mb-1">
                    Urgency: {t.urgency}
                  </div>
                  <div className="text-gray-300">{t.advice}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </Modal>

      {/* Feedback modal (post-job) */}
      <Modal
        open={feedbackOpen}
        onClose={() => setFeedbackOpen(false)}
        title="Rate your recent service"
      >
        {!activeFeedback ? (
          <p className="text-gray-300 text-sm">No feedback due right now.</p>
        ) : (
          <form className="grid gap-3" onSubmit={submitFeedback}>
            <p className="text-sm text-gray-200">{activeFeedback.label}</p>

            <div className="flex items-center gap-2">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setRatingValue(n)}
                  className={`w-8 h-8 rounded-full border border-white/20 text-sm ${
                    ratingValue >= n ? "bg-yellow-400 text-black" : "bg-neutral-800"
                  }`}
                >
                  {n}
                </button>
              ))}
              <span className="text-xs text-gray-300">(1 = poor, 5 = excellent)</span>
            </div>

            <textarea
              className="w-full bg-neutral-800 border border-white/10 rounded px-3 py-2 text-sm"
              rows={3}
              placeholder="Any comments about the mechanic?"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
            />

            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setFeedbackOpen(false)}
                className="px-4 py-2 bg-neutral-800 rounded"
              >
                Later
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded"
              >
                Submit
              </button>
            </div>
          </form>
        )}
      </Modal>

      {/* ACCEPTED TOKEN TOAST */}
      <Toast open={toastOpen} onClose={() => setToastOpen(false)}>
        {toastMsg}
      </Toast>
    </div>
  );
}
