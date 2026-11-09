import React from "react";
import ReactDOM from "react-dom/client";
import "./ui/theme.css";
import { EditorApp } from "./editor/EditorApp";

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <EditorApp />
  </React.StrictMode>,
);
