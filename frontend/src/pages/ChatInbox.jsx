import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api, getToken } from "../utils/api";

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

export default function ChatInbox() {
  const navigate = useNavigate();
  const token = getToken();

  const [items, setItems] = useState([]);
  const [status, setStatus] = useState("");

  const load = async () => {
    try {
      const res = await api("/api/chat");
      setItems(res.conversations || []);
      setStatus("");
    } catch (e) {
      setStatus(e?.message || "Failed to load conversations.");
    }
  };

  useEffect(() => {
    if (!token) {
      navigate("/login", { replace: true });
      return;
    }
    load();
    const t = setInterval(load, 5000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="min-h-screen bg-black/90 text-white font-lexend">
      <header className="bg-black/50 p-5 flex items-center justify-between border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center">
            <ChatIcon />
          </div>
          <div>
            <div className="text-lg font-semibold">Messages</div>
            <div className="text-xs text-gray-300">Open a conversation</div>
          </div>
        </div>

        <button
          onClick={() => navigate(-1)}
          className="bg-white/10 hover:bg-white/15 px-4 py-2 rounded-lg"
        >
          Back
        </button>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-6">
        {status && (
          <div className="mb-4 bg-red-700/40 border border-red-500/30 px-4 py-2 rounded-xl text-sm">
            {status}
          </div>
        )}

        <div className="flex justify-end mb-3">
          <button
            onClick={load}
            className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg text-sm"
          >
            Refresh
          </button>
        </div>

        {items.length === 0 ? (
          <div className="bg-white/5 border border-white/10 rounded-2xl p-4 text-gray-300 text-sm">
            No messages yet.
          </div>
        ) : (
          <div className="space-y-3">
            {items.map((c) => (
              <button
                key={c.otherId}
                onClick={() =>
                  navigate(`/chat/${c.otherId}`, { state: { otherName: c.name } })
                }
                className="w-full text-left bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="font-semibold">{c.name}</div>
                    <div className="text-sm text-gray-300 mt-1 line-clamp-1">
                      {c.lastText}
                    </div>
                  </div>
                  <div className="text-xs text-gray-400 whitespace-nowrap">
                    {c.lastAt ? new Date(c.lastAt).toLocaleString() : ""}
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
