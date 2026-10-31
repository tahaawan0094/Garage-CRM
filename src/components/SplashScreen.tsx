import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

const SPLASH_DURATION_MS = 2200;

export default function SplashScreen() {
  const [isVisible, setIsVisible] = useState(true);
  const [count, setCount] = useState(0);
  const [statusText, setStatusText] = useState("Initializing workshop workspace...");
  const [splashSettings] = useState(() => {
    try {
      const saved = localStorage.getItem("garage_crm_settings_v1");
      if (saved) return JSON.parse(saved);
    } catch (_) {}
    return null;
  });

  useEffect(() => {
    const startTime = performance.now();
    const duration = 1600;

    const interval = setInterval(() => {
      const elapsed = performance.now() - startTime;
      const progress = Math.min(100, Math.floor((elapsed / duration) * 100));
      setCount(progress);

      if (progress < 25) {
        setStatusText("Initializing workshop workspace...");
      } else if (progress < 60) {
        setStatusText("Connecting to database...");
      } else if (progress < 90) {
        setStatusText("Loading garage modules & inventory...");
      } else {
        setStatusText("Ready");
      }

      if (progress >= 100) {
        clearInterval(interval);
      }
    }, 20);

    const exitTimer = setTimeout(() => {
      setIsVisible(false);
    }, SPLASH_DURATION_MS);

    return () => {
      clearInterval(interval);
      clearTimeout(exitTimer);
    };
  }, []);

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          key="garage-splash"
          initial={{ opacity: 1 }}
          exit={{
            opacity: 0,
            scale: 1.01,
            transition: { duration: 0.4, ease: "easeInOut" },
          }}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 99999,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            background: "#ffffff",
            userSelect: "none",
          }}
          role="status"
          aria-label="Garage CRM Initializing"
        >
          {/* Subtle Light Clean Ambient Vignette */}
          <div
            style={{
              position: "absolute",
              inset: 0,
              background:
                "radial-gradient(circle at 50% 46%, rgba(255, 99, 28, 0.04) 0%, rgba(248, 250, 252, 0.8) 60%, #ffffff 100%)",
              pointerEvents: "none",
            }}
          />

          {/* Central Logo & Brand - Direct display without box */}
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
            style={{
              position: "relative",
              zIndex: 2,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              marginBottom: "26px",
            }}
          >
            {/* Logo without any box or badge */}
            <motion.img
              src={
                splashSettings?.logoUrl?.startsWith("data:")
                  ? splashSettings.logoUrl
                  : `${import.meta.env.BASE_URL}${splashSettings?.logoUrl || "Garage-crm-logo-light.png"}`
              }
              alt={splashSettings?.garageName || "Garage CRM Logo"}
              style={{
                width: "125px",
                height: "125px",
                objectFit: "contain",
                display: "block",
                marginBottom: "16px",
                filter: "drop-shadow(0 8px 24px rgba(241, 90, 36, 0.25))",
              }}
              draggable={false}
              animate={{ y: [0, -4, 0] }}
              transition={{ repeat: Infinity, duration: 2.8, ease: "easeInOut" }}
            />

            {/* Brand Title */}
            <h1
              style={{
                margin: 0,
                fontSize: "22px",
                fontWeight: 800,
                letterSpacing: "0.04em",
                color: "#0f172a",
                display: "flex",
                alignItems: "center",
                gap: "5px",
                lineHeight: 1.2,
                textAlign: "center",
              }}
            >
              {splashSettings?.garageName ? (
                <span>{splashSettings.garageName.toUpperCase()}</span>
              ) : (
                <>
                  <span>GARAGE</span>
                  <span style={{ color: "#ff631c" }}>CRM</span>
                </>
              )}
            </h1>

            {/* Subtitle */}
            <p
              style={{
                margin: "4px 0 0",
                fontSize: "11px",
                fontWeight: 600,
                letterSpacing: "0.14em",
                textTransform: "uppercase",
                color: "#64748b",
                textAlign: "center",
              }}
            >
              {splashSettings?.facilitySubtitle || "Workshop Management System"}
            </p>
          </motion.div>

          {/* Clean Light-Themed Progress Bar */}
          <div
            style={{
              position: "relative",
              zIndex: 2,
              width: "260px",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "9px",
            }}
          >
            {/* Progress Bar Track */}
            <div
              style={{
                width: "100%",
                height: "5px",
                borderRadius: "999px",
                background: "#e2e8f0",
                overflow: "hidden",
                position: "relative",
                boxShadow: "inset 0 1px 2px rgba(0, 0, 0, 0.05)",
              }}
            >
              <motion.div
                style={{
                  height: "100%",
                  width: `${count}%`,
                  borderRadius: "999px",
                  background: "linear-gradient(90deg, #ff631c, #ff8c42)",
                  boxShadow: "0 1px 8px rgba(255, 99, 28, 0.4)",
                  transition: "width 0.08s ease-out",
                }}
              />
            </div>

            {/* Info Row: Status on left, Percentage on right */}
            <div
              style={{
                width: "100%",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                fontSize: "11px",
                fontWeight: 500,
                color: "#64748b",
              }}
            >
              <span>{statusText}</span>
              <span style={{ color: "#0f172a", fontWeight: 700 }}>{count}%</span>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}


