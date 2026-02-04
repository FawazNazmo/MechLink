// frontend/src/App.jsx
import React from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";

import UserTypeSelection from "./pages/UserTypeSelection";
import LoginPage from "./pages/LoginPage";
import UserHome from "./pages/UserHome";
import MechanicHome from "./pages/MechanicHome";

// ✅ NEW CHAT PAGES
import ChatInbox from "./pages/ChatInbox";
import ChatThread from "./pages/ChatThread";

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<UserTypeSelection />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/user-home" element={<UserHome />} />
        <Route path="/mechanic-home" element={<MechanicHome />} />

        {/* ✅ NEW CHAT ROUTES */}
        <Route path="/messages" element={<ChatInbox />} />
        <Route path="/chat/:id" element={<ChatThread />} />

        {/* fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}
