// src/App.jsx
import React from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import UserTypeSelection from "./pages/UserTypeSelection";
import LoginPage from "./pages/LoginPage";
import UserHome from "./pages/UserHome";
import MechanicHome from "./pages/MechanicHome";

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<UserTypeSelection />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/user-home" element={<UserHome />} />
        <Route path="/mechanic-home" element={<MechanicHome />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}
