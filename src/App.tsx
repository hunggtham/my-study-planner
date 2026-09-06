import React from "react";
import { BrowserRouter as Router, Navigate, Route, Routes } from "react-router-dom";
import "./styles.css";
import { English } from "./pages/English";

export const App: React.FC = () => (
  <Router>
    <Routes>
      <Route path="/" element={<English />} />
      <Route path="/english" element={<English />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  </Router>
);

export default App;
