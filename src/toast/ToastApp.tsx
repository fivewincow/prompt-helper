import { useEffect, useState } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { onToastMessage } from "../bridge/events";
import "./toast.css";

const VISIBLE_MS = 2500;

/** First message arrives in the URL fragment (window just created); later ones as events. */
function initialMessage(): string {
  try {
    return decodeURIComponent(window.location.hash.slice(1));
  } catch {
    return "";
  }
}

export function ToastApp() {
  const [message, setMessage] = useState(initialMessage);
  const [shownAt, setShownAt] = useState(() => Date.now());

  useEffect(() => {
    const unlisten = onToastMessage((m) => {
      setMessage(m);
      setShownAt(Date.now());
    });
    return () => void unlisten.then((f) => f());
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => void getCurrentWindow().hide(), VISIBLE_MS);
    return () => clearTimeout(timer);
  }, [shownAt]);

  return <div className="toast">{message}</div>;
}
