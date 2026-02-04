import React, { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
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

export default function ChatThread() {
  const { id } = useParams(); // other user id
  const navigate = useNavigate();
  const location = useLocation();

  const token = getToken();
  const otherName = location.state?.otherName || "Chat";

  const [me, setMe] = useState(null);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [status, setStatus] = useState("");

  const listRef = useRef(null);

  const myId = useMemo(() => me?._id || me?.id, [me]);

  const loadMe = async () => {
    try {
      const d = await api("/api/auth/me");
      setMe(d.user);
    } catch {
      setMe(null);
    }
  };

  const loadMessages = async () => {
    try {
      const res = await api(`/api/chat/${id}`);
      setMessages(res.messages || []);
      setStatus("");
    } catch (e) {
      setStatus(e?.message || "Failed to load messages.");
    }
  };

  useEffect(() => {
    if (!token) {
      navigate("/login", { replace: true });
      return;
    }
    loadMe();
    loadMessages();

    const t = setInterval(loadMessages, 4000); // polling
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  useEffect(() => {
    if (!listRef.current) return;
    listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [messages]);

  const send = async () => {
    const trimmed = text.trim();
    if (!trimmed) return;

    setText("");

    // optimistic UI
    const temp = {
      _id: `temp_${Date.now()}`,
      from: myId || "me",
      text: trimmed,
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, temp]);

    try {
      await api(`/api/chat/${id}`, { method: "POST", body: { text: trimmed } });
      await loadMessages();
    } catch (e) {
      setStatus(e?.message || "Failed to send message.");
      await loadMessages();
    }
  };

  return (
    <div className="min-h-screen bg-black/90 text-white font-lexend">
      <header className="bg-black/50 p-5 flex items-center justify-between border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center">
            <ChatIcon />
          </div>
          <div>
            <div className="text-lg font-semibold">{otherName}</div>
            <div className="text-xs text-gray-300">MechLink Chat</div>
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

        <div
          ref={listRef}
          className="h-[65vh] overflow-y-auto rounded-2xl bg-white/5 border border-white/10 p-4"
        >
          {messages.length === 0 ? (
            <p className="text-gray-300 text-sm">No messages yet. Start the conversation.</p>
          ) : (
            messages.map((m) => {
              const mine = myId && String(m.from) === String(myId);
              return (
                <div
                  key={m._id}
                  className={`mb-3 flex ${mine ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[80%] rounded-2xl px-4 py-2 ${
                      mine ? "bg-white/15" : "bg-white/8"
                    }`}
                  >
                    <p className="text-sm leading-relaxed">{m.text}</p>
                    <p className="text-[11px] opacity-60 mt-1">
                      {m.createdAt ? new Date(m.createdAt).toLocaleString() : ""}
                    </p>
                  </div>
                </div>
              );
            })
          )}
        </div>

        <div className="mt-4 flex gap-2">
          <input
            className="flex-1 rounded-xl bg-white/5 border border-white/10 px-4 py-3 outline-none"
            placeholder="Type a message..."
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => (e.key === "Enter" ? send() : null)}
          />
          <button
            className="rounded-xl px-5 py-3 bg-white/15 hover:bg-white/20"
            onClick={send}
          >
            Send
          </button>
        </div>
      </main>
    </div>
  );
}
