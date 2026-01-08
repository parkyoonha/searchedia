import { createRoot } from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import App from "./App.tsx";
import { ReviewModeWrapper } from "./components/ReviewModeWrapper.tsx";
import "./index.css";

createRoot(document.getElementById("root")!).render(
  <BrowserRouter>
    <Routes>
      <Route path="/" element={<App />} />
      <Route path="/review/:token" element={<ReviewModeWrapper />} />
    </Routes>
  </BrowserRouter>
);
  