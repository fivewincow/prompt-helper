import React from "react";
import ReactDOM from "react-dom/client";
import "./ui/theme.css";
import { ToastApp } from "./toast/ToastApp";

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <ToastApp />
  </React.StrictMode>,
);
