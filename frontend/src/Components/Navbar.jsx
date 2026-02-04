// src/components/Navbar.jsx
import React from "react";
import { useNavigate } from "react-router-dom";

export default function Navbar({ role = "user", onLogout }) {
  const navigate = useNavigate();

  return (
    <header className="w-full bg-white/90 backdrop-blur-md border-b border-white/10 shadow-sm">
      <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h2
            className="text-2xl font-semibold cursor-pointer"
            onClick={() => navigate(role === "mechanic" ? "/mechanic-home" : "/user-home")}
            style={{ fontFamily: "Lexend Exa, sans-serif", color: "#0b61d6" }}
          >
            Mech-Link
          </h2>
          <nav className="hidden md:flex gap-6 text-sm text-gray-700">
            {role === "mechanic" ? (
              <>
                <button onClick={() => navigate("/mechanic-home")} className="hover:text-blue-600">Dashboard</button>
                <button onClick={() => navigate("/mechanic-requests")} className="hover:text-blue-600">Requests</button>
                <button onClick={() => navigate("/mechanic-profile")} className="hover:text-blue-600">Profile</button>
              </>
            ) : (
              <>
                <button onClick={() => navigate("/user-home")} className="hover:text-blue-600">Home</button>
                <button onClick={() => navigate("/book-service")} className="hover:text-blue-600">Book Service</button>
                <button onClick={() => navigate("/service-history")} className="hover:text-blue-600">Service History</button>
              </>
            )}
          </nav>
        </div>

        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate(role === "mechanic" ? "/mechanic-profile" : "/profile")}
            className="text-sm px-3 py-1 rounded-md hover:bg-gray-100"
          >
            Profile
          </button>
          <button
            onClick={() => {
              if (onLogout) onLogout();
              navigate("/");
            }}
            className="text-sm bg-blue-900/80 text-white px-3 py-1 rounded-md hover:bg-blue-800 transition"
          >
            Logout
          </button>
        </div>
      </div>
    </header>
  );
}
