import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";

// Self-hosted variable fonts — no network request to a font CDN at runtime.
import "@fontsource-variable/space-grotesk";
import "@fontsource-variable/plus-jakarta-sans";
import "@fontsource-variable/jetbrains-mono";

import "./styles/theme.css";

const container = document.getElementById("root");
if (!container) throw new Error("Missing #root element in index.html");

createRoot(container).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
