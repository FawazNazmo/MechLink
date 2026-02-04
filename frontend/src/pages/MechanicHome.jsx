// frontend/src/pages/MechanicHome.jsx
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api, getToken } from "../utils/api";
import Modal from "../Components/Modal";
import FeatureCard from "../Components/FeatureCard";

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

/* ✅ Helpers: user contact (safe fallbacks) */
function safeUserFullName(u) {
  if (!u) return "";
  const first = u.firstName || u.firstname || "";
  const last = u.lastName || u.lastname || "";
  const full = `${first}${last ? ` ${last}` : ""}`.trim();
  return full || u.fullName || u.name || u.username || "";
}
function safeUserEmail(u) {
  if (!u) return "";
  return u.email || u.mail || u.userEmail || "";
}
function safeUserPhone(u) {
  if (!u) return "";
  return (
    u.phone ||
    u.phoneNumber ||
    u.mobile ||
    u.mobileNumber ||
    u.contactNumber ||
    ""
  );
}

export default function MechanicHome() {
  const navigate = useNavigate();
  const token = getToken();

  const [me, setMe] = useState(null);
  const [loc, setLoc] = useState(null);
  const [nearby, setNearby] = useState([]);
  const [assignedTokens, setAssignedTokens] = useState([]);
  const [serviceBookings, setServiceBookings] = useState([]);
  const [statusMsg, setStatusMsg] = useState("");
  const [showWelcome, setShowWelcome] = useState(false);

  // Modals
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [showBankModal, setShowBankModal] = useState(false);

  // Bank
  const [bank, setBank] = useState({
    accountName: "",
    accountNumber: "",
    sortCode: "",
  });
  const [savingBank, setSavingBank] = useState(false);

  // Mechanic schedule
  const [schedule, setSchedule] = useState({
    mon: { start: "09:00", end: "17:00", on: true },
    tue: { start: "09:00", end: "17:00", on: true },
    wed: { start: "09:00", end: "17:00", on: true },
    thu: { start: "09:00", end: "17:00", on: true },
    fri: { start: "09:00", end: "17:00", on: true },
    sat: { start: "10:00", end: "14:00", on: false },
    sun: { start: "00:00", end: "00:00", on: false },
  });

  // Feedback summary
  const [myRating, setMyRating] = useState(null);
  const [myFeedback, setMyFeedback] = useState([]);

  // Job stats
  const [jobStats, setJobStats] = useState({
    totalJobs: 0,
    last30Days: 0,
  });

  // Integrity score
  const [integrity, setIntegrity] = useState(null);

  // Initial load
  useEffect(() => {
    if (!token) {
      navigate("/login?type=mechanic");
      return;
    }
    (async () => {
      try {
        const d = await api("/api/auth/me");
        setMe(d.user);
      } catch {}
    })();

    if (localStorage.getItem("ml_welcome") === "1") {
      setShowWelcome(true);
      localStorage.removeItem("ml_welcome");
    }

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setLoc({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => setStatusMsg("Location permission denied.")
      );
    }
  }, [token, navigate]);

  // One-time bank check after 'me'
  useEffect(() => {
    if (!me) return;
    (async () => {
      try {
        await api("/api/bank/me");
      } catch (e) {
        if (/no bank|not found|404/i.test(e?.message || "")) {
          setShowBankModal(true);
        }
      }
    })();
  }, [me]);

  // Load nearby breakdowns, assigned tokens, bookings & feedback & stats
  const loadNearby = async () => {
    if (!loc) return;
    try {
      const res = await api(
        `/api/tokens/nearby?lat=${loc.lat}&lng=${loc.lng}&radius=5000`
      );
      const list = res.tokens || res.items || [];
      setNearby(list);
      setStatusMsg(list.length ? "" : "No nearby breakdowns right now.");
    } catch {
      setStatusMsg("Failed to load nearby tokens.");
    }
  };

  const loadAssignedTokens = async () => {
    try {
      const res = await api("/api/tokens/assigned");
      const raw = res.tokens || res.items || [];
      const visible = raw.filter((t) => t.status !== "resolved");
      setAssignedTokens(visible);
    } catch {
      setAssignedTokens([]);
    }
  };

  const loadServiceBookings = async () => {
    try {
      const res = await api("/api/bookings/assigned");
      setServiceBookings(res.bookings || []);
    } catch {
      setServiceBookings([]);
    }
  };

  const loadMyFeedback = async () => {
    try {
      const res = await api("/api/feedback/my-summary");
      setMyRating(res.avg);
      setMyFeedback(res.items || []);
    } catch {
      setMyRating(null);
      setMyFeedback([]);
    }
  };

  const loadJobStats = async () => {
    try {
      const [histRes, integRes] = await Promise.all([
        api("/api/history/mechanic"),
        api("/api/mechanics/integrity/me"),
      ]);

      const items = histRes.items || [];
      const totalJobs = items.length;

      const now = new Date();
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      const last30Days = items.filter((h) => {
        if (!h.date) return false;
        const d = new Date(h.date);
        return d >= thirtyDaysAgo;
      }).length;

      setJobStats({ totalJobs, last30Days });
      setIntegrity(integRes);
    } catch {
      setJobStats({ totalJobs: 0, last30Days: 0 });
      setIntegrity(null);
    }
  };

  useEffect(() => {
    if (loc) loadNearby();
    loadAssignedTokens();
    loadServiceBookings();
    loadMyFeedback();
    loadJobStats();
    const id = setInterval(() => {
      if (loc) loadNearby();
      loadAssignedTokens();
      loadServiceBookings();
      loadMyFeedback();
      loadJobStats();
    }, 15000);
    return () => clearInterval(id);
  }, [loc]);

  // Token actions
  const acceptToken = async (id) => {
    try {
      await api(`/api/tokens/${id}/accept`, { method: "POST" });
      setStatusMsg("Accepted the job.");
      await loadNearby();
      await loadAssignedTokens();
    } catch {
      setStatusMsg("Failed to accept (maybe already taken).");
    }
  };

  const rejectToken = async (id) => {
    try {
      await api(`/api/tokens/${id}/reject`, { method: "POST" });
      setStatusMsg("Job rejected.");
      await loadNearby();
      await loadAssignedTokens();
    } catch {
      setStatusMsg("Failed to reject.");
    }
  };

  const resolveToken = async (id) => {
    try {
      await api(`/api/tokens/${id}/resolve`, { method: "POST" });
      setStatusMsg("Marked as resolved.");
      await loadNearby();
      await loadAssignedTokens();
      await loadMyFeedback();
      await loadJobStats();
    } catch {
      setStatusMsg("Failed to resolve.");
    }
  };

  const logout = () => {
    localStorage.clear();
    navigate("/");
  };

  // Save schedule
  const saveSchedule = async (e) => {
    e.preventDefault();
    try {
      const res = await api("/api/mechanics/schedule", {
        method: "POST",
        body: { schedule },
      });
      setSchedule(res.schedule || schedule);
      alert("Schedule saved successfully.");
      setScheduleOpen(false);
    } catch (err) {
      alert(err.message || "Failed to save schedule");
    }
  };

  // Save bank details
  const saveBank = async (e) => {
    e.preventDefault();
    if (!bank.accountName || !bank.accountNumber || !bank.sortCode) {
      alert("Please fill all fields.");
      return;
    }
    try {
      setSavingBank(true);
      await api("/api/bank/me", { method: "POST", body: bank });
      alert("Bank details saved.");
      setShowBankModal(false);
    } catch (err) {
      alert(err.message || "Failed to save bank details");
    } finally {
      setSavingBank(false);
    }
  };

  // Cancel a scheduled booking
  const cancelBooking = async (id) => {
    if (
      !window.confirm(
        "Cancel this booking? The user will be notified and deposit refunded."
      )
    ) {
      return;
    }
    try {
      await api(`/api/bookings/${id}/cancel`, { method: "POST" });
      setStatusMsg(
        "Booking cancelled. User will be notified and their £10 deposit will be refunded within 3 working days."
      );
      await loadServiceBookings();
    } catch (err) {
      setStatusMsg(err.message || "Failed to cancel booking.");
    }
  };

  const name = me?.firstName || "Mechanic";

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
        <h1 className="text-3xl font-bold">MechLink — Mechanic Dashboard</h1>

        {/* ✅ RIGHT CORNER: Chat logo + Logout */}
        <div className="flex items-center gap-3">
          <button
            title="Messages"
            onClick={() => navigate("/messages")}
            className="w-11 h-11 rounded-xl bg-white/10 hover:bg-white/15 flex items-center justify-center"
          >
            <ChatIcon />
          </button>

          <button
            onClick={logout}
            className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg"
          >
            Logout
          </button>
        </div>
      </header>

      {/* Main */}
      <main className="flex-grow flex flex-col items-center py-10">
        {showWelcome && (
          <div className="mb-5 bg-blue-700/85 border border-white/10 px-6 py-3 rounded-xl shadow">
            Welcome, {name}.
          </div>
        )}

        {/* Ratings + Job Stats + Integrity Summary */}
        <div className="bg-black/60 p-4 rounded-xl border border-white/10 w-11/12 md:w-3/4 mb-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <div className="space-y-1 text-gray-200">
              <div>
                <span className="font-semibold">Your average rating:</span>{" "}
                {myRating == null ? "—" : `${myRating} ★`}
              </div>
              <div className="text-sm text-gray-300">
                <span className="font-semibold">Integrity score:</span>{" "}
                {integrity?.integrityScore != null
                  ? `${integrity.integrityScore}/100`
                  : "—"}
                {integrity?.fairPercent != null && (
                  <span className="text-gray-400">
                    {" "}
                    (fair-price jobs: {integrity.fairPercent}%)
                  </span>
                )}
              </div>
            </div>
            <div className="text-sm text-gray-300">
              <span className="font-semibold">Completed jobs:</span>{" "}
              {jobStats.totalJobs}{" "}
              <span className="text-gray-400">
                (last 30 days: {jobStats.last30Days})
              </span>
            </div>
            <button
              className="text-sm underline"
              onClick={() => setFeedbackOpen(true)}
            >
              View feedback
            </button>
          </div>
        </div>

        {/* Nearby Breakdown Requests */}
        <div className="bg-black/60 p-6 rounded-2xl shadow-xl w-11/12 md:w-3/4 border border-white/10">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-semibold">Nearby Breakdown Requests</h2>
            <button
              onClick={loadNearby}
              className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg"
            >
              Refresh
            </button>
          </div>

          {statusMsg && <p className="text-gray-300 mb-4">{statusMsg}</p>}

          {nearby.map((t) => {
            const user = t.user || {};
            const fullName = safeUserFullName(user);
            const email = safeUserEmail(user);
            const phone = safeUserPhone(user);

            return (
              <div
                key={t._id || t.id}
                className="bg-black/60 p-4 rounded-xl border border-white/10 mb-3"
              >
                <div className="grid md:grid-cols-3 gap-2 text-sm text-gray-300">
                  <div>
                    <span className="font-semibold">User:</span>{" "}
                    {fullName || user.username || "—"}
                    {user.username && (
                      <span className="text-gray-500"> (@{user.username})</span>
                    )}
                  </div>

                  <div>
                    <span className="font-semibold">Email:</span>{" "}
                    {email ? (
                      <a className="underline" href={`mailto:${email}`}>
                        {email}
                      </a>
                    ) : (
                      "—"
                    )}
                  </div>

                  <div>
                    <span className="font-semibold">Phone:</span>{" "}
                    {phone ? (
                      <a className="underline" href={`tel:${phone}`}>
                        {phone}
                      </a>
                    ) : (
                      "—"
                    )}
                  </div>

                  <div>
                    <span className="font-semibold">Car:</span>{" "}
                    {user.carDetails || "—"}
                  </div>

                  <div>
                    <span className="font-semibold">Status:</span> {t.status}
                  </div>

                  <div>
                    <span className="font-semibold">Priority:</span>{" "}
                    <span
                      className={
                        t.priorityLevel === "High"
                          ? "text-red-400 font-semibold"
                          : t.priorityLevel === "Low"
                          ? "text-green-400"
                          : "text-yellow-300"
                      }
                    >
                      {t.priorityLevel || "Medium"}
                    </span>
                  </div>

                  <div>
                    <span className="font-semibold">ETA:</span>{" "}
                    {t.etaMinutes != null ? `${t.etaMinutes} min` : "—"}
                  </div>

                  <div className="md:col-span-3">
                    <span className="font-semibold">Location:</span>{" "}
                    lat {t.location?.lat ?? "?"}, lng {t.location?.lng ?? "?"}
                    {typeof t.distanceKm === "number" && (
                      <span className="ml-2 text-gray-400">
                        ({t.distanceKm.toFixed(2)} km away)
                      </span>
                    )}
                  </div>
                </div>

                {t.status === "open" && (
                  <div className="mt-3 flex gap-3">
                    <button
                      onClick={() => acceptToken(t._id || t.id)}
                      className="bg-green-600 hover:bg-green-700 px-4 py-2 rounded"
                    >
                      Accept
                    </button>
                    <button
                      onClick={() => rejectToken(t._id || t.id)}
                      className="bg-red-600 hover:bg-red-700 px-4 py-2 rounded"
                    >
                      Reject
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Assigned Breakdown Token Jobs */}
        <div className="bg-black/60 p-6 rounded-2xl border border-white/10 w-11/12 md:w-3/4 mt-6">
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-xl font-semibold">Assigned Breakdown Jobs</h3>
            <button onClick={loadAssignedTokens} className="text-sm underline">
              Refresh
            </button>
          </div>

          {assignedTokens.length === 0 && (
            <p className="text-gray-300">No assignments yet.</p>
          )}

          {assignedTokens.map((t) => {
            const user = t.user || {};
            const fullName = safeUserFullName(user);
            const email = safeUserEmail(user);
            const phone = safeUserPhone(user);

            return (
              <div key={t._id} className="bg-black/50 p-3 rounded-lg mb-2">
                <div className="text-sm text-gray-200">
                  <span className="font-semibold">User:</span>{" "}
                  {fullName || user.username || "—"}
                  {user.username && (
                    <span className="text-gray-500"> (@{user.username})</span>
                  )}{" "}
                  — {user.carDetails || "car"}
                </div>

                <div className="text-sm text-gray-300 mt-1">
                  <span className="font-semibold">Email:</span>{" "}
                  {email ? (
                    <a className="underline" href={`mailto:${email}`}>
                      {email}
                    </a>
                  ) : (
                    "—"
                  )}
                </div>

                <div className="text-sm text-gray-300">
                  <span className="font-semibold">Phone:</span>{" "}
                  {phone ? (
                    <a className="underline" href={`tel:${phone}`}>
                      {phone}
                    </a>
                  ) : (
                    "—"
                  )}
                </div>

                <div className="text-sm text-gray-400 mt-1">
                  Status: {t.status}
                </div>

                <button
                  onClick={() => resolveToken(t._id)}
                  className="mt-2 bg-yellow-600 hover:bg-yellow-700 px-3 py-1 rounded text-sm"
                >
                  Mark Resolved
                </button>
              </div>
            );
          })}
        </div>

        {/* Upcoming Service Bookings */}
        <div className="bg-black/60 p-6 rounded-2xl border border-white/10 w-11/12 md:w-3/4 mt-6">
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-xl font-semibold">Upcoming Service Bookings</h3>
            <button onClick={loadServiceBookings} className="text-sm underline">
              Refresh
            </button>
          </div>

          {serviceBookings.length === 0 && (
            <p className="text-gray-300">No upcoming bookings yet.</p>
          )}

          {serviceBookings.map((b) => {
            const user = b.user || {};
            const fullName = safeUserFullName(user);
            const email = safeUserEmail(user);
            const phone = safeUserPhone(user);

            return (
              <div key={b._id} className="bg-black/50 p-3 rounded-lg mb-2 text-sm">
                <div className="text-gray-200 font-semibold">
                  {fullName || user.username || "Customer"} — {b.issue}
                </div>

                <div className="text-gray-400">
                  {b.preferredDate} at {b.preferredTime} • Status: {b.status}
                </div>

                <div className="text-gray-300 mt-2">
                  <span className="font-semibold">Email:</span>{" "}
                  {email ? (
                    <a className="underline" href={`mailto:${email}`}>
                      {email}
                    </a>
                  ) : (
                    "—"
                  )}
                </div>

                <div className="text-gray-300">
                  <span className="font-semibold">Phone:</span>{" "}
                  {phone ? (
                    <a className="underline" href={`tel:${phone}`}>
                      {phone}
                    </a>
                  ) : (
                    "—"
                  )}
                </div>

                {b.status === "requested" && (
                  <button
                    onClick={() => cancelBooking(b._id)}
                    className="mt-2 bg-red-600 hover:bg-red-700 px-3 py-1 rounded text-sm"
                  >
                    Cancel this booking
                  </button>
                )}
              </div>
            );
          })}
        </div>

        {/* Feature Shortcuts */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-10 w-11/12 md:w-3/4">
          <FeatureCard
            title="Work Schedule"
            subtitle="Set your available working days."
            onClick={() => setScheduleOpen(true)}
          />
          <FeatureCard
            title="Your Feedback & Rating"
            subtitle="See what users said about your service."
            onClick={() => setFeedbackOpen(true)}
          />
        </div>
      </main>

      <footer className="bg-black/50 text-center py-4 text-gray-300 text-sm">
        © 2025 MechLink
      </footer>

      {/* Schedule Modal */}
      <Modal
        open={scheduleOpen}
        onClose={() => setScheduleOpen(false)}
        title="Set Work Schedule"
      >
        <form className="grid gap-4" onSubmit={saveSchedule}>
          {Object.entries(schedule).map(([day, cfg]) => (
            <div
              key={day}
              className="grid grid-cols-4 gap-3 bg-neutral-800/60 border border-white/10 rounded-xl p-3"
            >
              <div className="capitalize text-gray-200">{day}</div>
              <input
                type="time"
                value={cfg.start}
                onChange={(e) =>
                  setSchedule((s) => ({
                    ...s,
                    [day]: { ...s[day], start: e.target.value },
                  }))
                }
                className="bg-neutral-900 border border-white/10 rounded px-2 py-1"
              />
              <input
                type="time"
                value={cfg.end}
                onChange={(e) =>
                  setSchedule((s) => ({
                    ...s,
                    [day]: { ...s[day], end: e.target.value },
                  }))
                }
                className="bg-neutral-900 border border-white/10 rounded px-2 py-1"
              />
              <label className="text-gray-300 text-sm flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={cfg.on}
                  onChange={(e) =>
                    setSchedule((s) => ({
                      ...s,
                      [day]: { ...s[day], on: e.target.checked },
                    }))
                  }
                />
                Available
              </label>
            </div>
          ))}
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={() => setScheduleOpen(false)}
              className="bg-neutral-800 px-4 py-2 rounded"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded"
            >
              Save
            </button>
          </div>
        </form>
      </Modal>

      {/* Feedback Modal */}
      <Modal
        open={feedbackOpen}
        onClose={() => setFeedbackOpen(false)}
        title="Your Feedback & Rating"
      >
        <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
          {myFeedback.length === 0 ? (
            <p className="text-gray-300 text-sm">No user feedback yet.</p>
          ) : (
            myFeedback.map((f, idx) => (
              <div
                key={idx}
                className="bg-neutral-800/60 border border-white/10 rounded-xl p-3 text-sm"
              >
                <div className="text-gray-200 font-semibold">
                  @{f.userName} — {f.rating}★
                </div>
                <div className="text-gray-300 mt-1">{f.comment}</div>
                <div className="text-gray-500 text-xs mt-1">
                  {f.date ? new Date(f.date).toLocaleString() : ""}
                </div>
              </div>
            ))
          )}
        </div>
      </Modal>

      {/* Bank details Modal */}
      <Modal
        open={showBankModal}
        onClose={() => setShowBankModal(false)}
        title="Add your bank account"
      >
        <form className="grid gap-3" onSubmit={saveBank}>
          <p className="text-sm text-gray-300">
            Add your bank details so deposits and payments can be routed to you.
          </p>
          <label className="text-sm text-gray-300">
            Name on account
            <input
              className="mt-1 w-full bg-neutral-800 border border-white/10 rounded px-3 py-2"
              value={bank.accountName}
              onChange={(e) =>
                setBank((b) => ({ ...b, accountName: e.target.value }))
              }
              required
            />
          </label>
          <label className="text-sm text-gray-300">
            Account number
            <input
              className="mt-1 w-full bg-neutral-800 border border-white/10 rounded px-3 py-2"
              value={bank.accountNumber}
              onChange={(e) =>
                setBank((b) => ({ ...b, accountNumber: e.target.value }))
              }
              inputMode="numeric"
              required
            />
          </label>
          <label className="text-sm text-gray-300">
            Sort code
            <input
              className="mt-1 w-full bg-neutral-800 border border-white/10 rounded px-3 py-2"
              value={bank.sortCode}
              onChange={(e) =>
                setBank((b) => ({ ...b, sortCode: e.target.value }))
              }
              placeholder="e.g. 12-34-56"
              required
            />
          </label>
          <div className="flex justify-end gap-3">
            <button
              type="button"
              className="px-4 py-2 bg-neutral-800 rounded"
              onClick={() => setShowBankModal(false)}
            >
              Later
            </button>
            <button
              type="submit"
              disabled={savingBank}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded"
            >
              {savingBank ? "Saving…" : "Save"}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
