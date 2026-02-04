// frontend/src/pages/RegistrationPage.jsx
import React, { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { api } from "../utils/api";

export default function RegistrationPage() {
  const navigate = useNavigate();
  const location = useLocation();

  const search = new URLSearchParams(location.search);
  const initialType = search.get("type") === "mechanic" ? "mechanic" : "user";

  const [type] = useState(initialType);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [garageName, setGarageName] = useState("");
  const [garageAddress, setGarageAddress] = useState("");

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const id = "lexend-font-link";
    if (!document.getElementById(id)) {
      const link = document.createElement("link");
      link.id = id;
      link.rel = "stylesheet";
      link.href =
        "https://fonts.googleapis.com/css2?family=Lexend+Exa:wght@400;600;700&display=swap";
      document.head.appendChild(link);
    }
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setBusy(true);

    try {
      const body = {
        firstName,
        lastName,
        phone,
        email,
        username: email, // use email as username
        password,
        role: type === "mechanic" ? "mechanic" : "user",
      };

      if (type === "mechanic") {
        body.garageName = garageName;
        body.garageAddress = garageAddress;
      }

      const { token, user } = await api("/api/auth/register", {
        method: "POST",
        body,
      });

      localStorage.setItem("token", token);
      localStorage.setItem("role", user.role);
      localStorage.setItem("user", JSON.stringify(user));
      localStorage.setItem("ml_welcome", "1");

      if (user.role === "mechanic") navigate("/mechanic-home");
      else navigate("/user-home");
    } catch (err) {
      setError(err.message || "Registration failed");
    } finally {
      setBusy(false);
    }
  };

  const goLogin = () => {
    navigate(`/login?type=${type}`);
  };

  return (
    <div
      className="min-h-screen w-full flex items-center justify-center md:justify-start font-lexend text-white"
      style={{
        backgroundImage: "url('/images/Home-Bg.png')", // swap to signup-specific image if you have one
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
    >
      {/* Frosted glass card */}
      <div className="mx-4 md:ml-16 bg-white/18 backdrop-blur-md border border-white/30 rounded-3xl shadow-2xl w-full max-w-sm px-8 py-10">
        <h1 className="text-xl font-semibold tracking-[0.25em] text-center mb-6 uppercase">
          {type === "mechanic" ? "Mechanic Register" : "User Register"}
        </h1>

        <form onSubmit={handleSubmit} className="space-y-3">
          <input
            type="text"
            placeholder="First Name"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            className="w-full px-4 py-3 rounded-md bg-white/85 text-gray-900 text-sm tracking-wide placeholder-gray-500 border border-white/70 shadow-inner focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          />
          <input
            type="text"
            placeholder="Last Name"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            className="w-full px-4 py-3 rounded-md bg-white/85 text-gray-900 text-sm tracking-wide placeholder-gray-500 border border-white/70 shadow-inner focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          />
          <input
            type="text"
            placeholder="(+44) Phone Number"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="w-full px-4 py-3 rounded-md bg-white/85 text-gray-900 text-sm tracking-wide placeholder-gray-500 border border-white/70 shadow-inner focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          />
          <input
            type="email"
            placeholder="E-mail address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-4 py-3 rounded-md bg-white/85 text-gray-900 text-sm tracking-wide placeholder-gray-500 border border-white/70 shadow-inner focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-4 py-3 rounded-md bg-white/85 text-gray-900 text-sm tracking-wide placeholder-gray-500 border border-white/70 shadow-inner focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          />

          {type === "mechanic" && (
            <>
              <input
                type="text"
                placeholder="Garage Name"
                value={garageName}
                onChange={(e) => setGarageName(e.target.value)}
                className="w-full px-4 py-3 rounded-md bg-white/85 text-gray-900 text-sm tracking-wide placeholder-gray-500 border border-white/70 shadow-inner focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
              <input
                type="text"
                placeholder="Garage Address"
                value={garageAddress}
                onChange={(e) => setGarageAddress(e.target.value)}
                className="w-full px-4 py-3 rounded-md bg-white/85 text-gray-900 text-sm tracking-wide placeholder-gray-500 border border-white/70 shadow-inner focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </>
          )}

          {error && (
            <div className="text-xs text-red-100 bg-red-800/70 border border-red-400/70 rounded-md px-3 py-2 text-center mt-1">
              {error}
            </div>
          )}

          <div className="space-y-3 pt-2">
            <button
              type="submit"
              disabled={busy}
              className="w-full py-2.5 rounded-md text-sm font-semibold tracking-[0.2em] uppercase bg-[#16386F] hover:bg-[#102b55] disabled:bg-[#1b3560]/60 transition-colors"
            >
              {busy ? "Registering..." : "Register"}
            </button>

            <button
              type="button"
              onClick={goLogin}
              className="w-full py-2.5 rounded-md text-sm font-semibold tracking-[0.2em] uppercase bg-[#1f3962] hover:bg-[#142846] border border-white/50 transition-colors"
            >
              Back to Login
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
