import React from "react";
import { useNavigate } from "react-router-dom";

const UserTypeSelection = () => {
  const navigate = useNavigate();

  return (
    <div
      className="h-screen w-screen bg-cover bg-center flex items-center justify-between px-20"
      style={{ backgroundImage: "url('/images/garage-bg.jpg')" }}
    >
      <div className="transform -translate-y-60">
        <h1 className="text-6xl font-lexend text-white drop-shadow-lg blur-[1px]">Mech-Link</h1>
        <p className="text-lg font-lexend text-gray-200 mt-2 blur-[1px]">repair smart</p>
      </div>

      <div className="relative bg-gray-900/70 backdrop-blur-md p-10 rounded-2xl shadow-2xl w-96 border border-white/10">
        <p className="text-white text-lg font-lexend mb-6 text-center">
          Welcome to Mech-Link <br /> Are you a?
        </p>

        <div className="space-y-4">
          <button
            onClick={() => navigate("/login?type=user")}
            className="w-full py-3 bg-blue-900/80 text-white font-lexend font-semibold rounded-lg shadow-md hover:bg-blue-800 transition relative overflow-hidden"
          >
            <span className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/asfalt-dark.png')] opacity-20 mix-blend-overlay"></span>
            <span className="relative">User</span>
          </button>
          <button
            onClick={() => navigate("/login?type=mechanic")}
            className="w-full py-3 bg-blue-900/80 text-white font-lexend font-semibold rounded-lg shadow-md hover:bg-blue-800 transition relative overflow-hidden"
          >
            <span className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/asfalt-dark.png')] opacity-20 mix-blend-overlay"></span>
            <span className="relative">Mechanic</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default UserTypeSelection;
