import { useEffect } from "react";
import "../styles/globals.css";
import { logSecurityAction } from "../lib/api";

export default function App({ Component, pageProps }) {
  useEffect(() => {
    const key = "land_registry_login_logged";
    if (typeof window === "undefined") {
      return;
    }

    if (sessionStorage.getItem(key)) {
      return;
    }

    sessionStorage.setItem(key, "true");

    logSecurityAction({
      action: "user_login",
      role: "operator",
      metadata: {
        source: "frontend_app_boot",
        user_agent: navigator.userAgent
      }
    }).catch(() => {});
  }, []);

  return <Component {...pageProps} />;
}
