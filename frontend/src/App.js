import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import UserTypeSelection from "./pages/UserTypeSelection";
import LoginPage from "./pages/LoginPage";
import RegistrationPage from "./pages/RegistrationPage";
import UserHome from "./pages/UserHome";
import MechanicHome from "./pages/MechanicHome";

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<UserTypeSelection />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegistrationPage />} />
        <Route path="/user-home" element={<UserHome />} />
        <Route path="/mechanic-home" element={<MechanicHome />} />
      </Routes>
    </Router>
  );
}

export default App;
