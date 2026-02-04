// src/components/FeatureCard.jsx
import React from "react";

export default function FeatureCard({ title, subtitle, onClick }) {
  return (
    <button
      onClick={onClick}
      className="text-left bg-black/60 hover:bg-black/70 transition rounded-2xl p-6 border border-white/10 focus:outline-none focus:ring-2 focus:ring-blue-500"
    >
      <h4 className="text-lg font-semibold font-lexend mb-1">{title}</h4>
      <p className="text-sm text-gray-300">{subtitle}</p>
    </button>
  );
}
