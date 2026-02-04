import { useNavigate, useLocation } from "react-router-dom";
import { useState } from "react";
import { api } from "../utils/api";

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();

  const initialRole = new URLSearchParams(location.search).get("type") ?? "user";
  const [role] = useState(initialRole); // fixed by URL
  const [existingUser, setExistingUser] = useState(true);

  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    garageName: "",
    garageAddress: "",
    username: "",
    password: "",
    carDetails: "",
  });

  const handleChange = (e) =>
    setForm({
      ...form,
      [e.target.name]: e.target.value,
    });

  const finishLogin = (data) => {
    // store token in both keys
    localStorage.setItem("token", data.token);
    localStorage.setItem("ml_token", data.token);
    localStorage.setItem("ml_role", data.user.role);
    localStorage.setItem("ml_user", JSON.stringify(data.user));
    localStorage.setItem("ml_welcome", "1");

    if (data.user.role === "user") {
      navigate("/user-home", { replace: true });
    } else {
      navigate("/mechanic-home", { replace: true });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (existingUser) {
        // login
        const loginBody = form.username.includes("@")
          ? { email: form.username.trim(), password: form.password }
          : { username: form.username.trim(), password: form.password };

        const data = await api("/api/auth/login", {
          method: "POST",
          body: loginBody,
        });
        finishLogin(data);
      } else {
        // register
        const payload =
          role === "user"
            ? {
                role: "user",
                firstName: form.firstName,
                lastName: form.lastName,
                email: form.email,
                phone: form.phone,
                username: form.username,
                password: form.password,
                carDetails: form.carDetails,
              }
            : {
                role: "mechanic",
                firstName: form.firstName,
                lastName: form.lastName,
                email: form.email,
                phone: form.phone,
                username: form.username,
                password: form.password,
                garageName: form.garageName,
                garageAddress: form.garageAddress,
              };

        const data = await api("/api/auth/register", {
          method: "POST",
          body: payload,
        });
        finishLogin(data);
      }
    } catch (err) {
      alert(err.message || "Request failed");
    }
  };

  const titleRole = role === "user" ? "User" : "Mechanic";

  return (
    <div
      className="h-screen w-screen bg-cover bg-center flex items-center justify-start px-20"
      style={{ backgroundImage: "url('/images/signup-BG.png')" }}
    >
      <div className="relative bg-gray-900/70 backdrop-blur-md p-10 rounded-2xl shadow-2xl w-96 border border-white/10 font-lexend">
        <h1 className="text-3xl font-bold text-white text-center mb-6 drop-shadow-md">
          {existingUser
            ? `${titleRole} Login`
            : `${titleRole} Registration`}
        </h1>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {!existingUser && (
            <>
              <input
                className="w-full px-4 py-2 rounded bg-gray-200 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder:text-gray-500"
                type="text"
                name="firstName"
                placeholder="First Name"
                onChange={handleChange}
                required
              />
              <input
                className="w-full px-4 py-2 rounded bg-gray-200 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder:text-gray-500"
                type="text"
                name="lastName"
                placeholder="Last Name"
                onChange={handleChange}
                required
              />
              <input
                className="w-full px-4 py-2 rounded bg-gray-200 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder:text-gray-500"
                type="email"
                name="email"
                placeholder="E-mail address"
                onChange={handleChange}
                required
              />
              <input
                className="w-full px-4 py-2 rounded bg-gray-200 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder:text-gray-500"
                type="tel"
                name="phone"
                placeholder="(+44) Phone Number"
                onChange={handleChange}
                required
              />

              {role === "user" && (
                <input
                  className="w-full px-4 py-2 rounded bg-gray-200 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder:text-gray-500"
                  type="text"
                  name="carDetails"
                  placeholder="Car Model / Details"
                  onChange={handleChange}
                  required
                />
              )}

              {role === "mechanic" && (
                <>
                  <input
                    className="w-full px-4 py-2 rounded bg-gray-200 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder:text-gray-500"
                    type="text"
                    name="garageName"
                    placeholder="Garage Name"
                    onChange={handleChange}
                    required
                  />
                  <input
                    className="w-full px-4 py-2 rounded bg-gray-200 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder:text-gray-500"
                    type="text"
                    name="garageAddress"
                    placeholder="Garage Address"
                    onChange={handleChange}
                    required
                  />
                </>
              )}
            </>
          )}

          <input
            className="w-full px-4 py-2 rounded bg-gray-200 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder:text-gray-500"
            type="text"
            name="username"
            placeholder="Username or Email"
            onChange={handleChange}
            required
          />
          <input
            className="w-full px-4 py-2 rounded bg-gray-100 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder:text-gray-500"
            type="password"
            name="password"
            placeholder="Password"
            onChange={handleChange}
            required
          />

          <button
            type="submit"
            className="relative bg-blue-900/80 text-white py-2 rounded-lg font-semibold hover:bg-blue-800 transition overflow-hidden"
          >
            <span className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/asfalt-dark.png')] opacity-20 mix-blend-overlay"></span>
            <span className="relative">
              {existingUser ? "Login" : "Register"}
            </span>
          </button>

          <p className="mt-4 text-center text-white/80">
            {existingUser ? "New user?" : "Already registered?"}{" "}
            <span
              className="text-blue-400 cursor-pointer hover:underline"
              onClick={() => setExistingUser(!existingUser)}
            >
              {existingUser ? "Register" : "Login"}
            </span>
          </p>
        </form>
      </div>
    </div>
  );
}
