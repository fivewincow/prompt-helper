import React from "react";
import ReactDOM from "react-dom/client";
import "./ui/theme.css";
import { OverlayApp } from "./overlay/OverlayApp";
import { startController } from "./controller/controller";

// Started outside React so StrictMode's double effects cannot register hotkeys twice.
startController().catch((e) => console.error("controller failed to start", e));

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <OverlayApp />
  </React.StrictMode>,
);
