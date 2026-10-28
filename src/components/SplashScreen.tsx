import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

const SPLASH_DURATION_MS = 2400;

export default function SplashScreen() {
  const [isVisible, setIsVisible] = useState(true);
  const [count, setCount] = useState(0);
  const [statusText, setStatusText] = useState("Initializing workshop workspace...");

  useEffect(() => {
    const startTime = performance.now();
    const duration = 1800;

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
            scale: 1.02,
            transition: { duration: 0.45, ease: "easeInOut" },
          }}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 99999,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            background: "#16212f",
            userSelect: "none",
          }}
          role="status"
          aria-label="Garage CRM Initializing"
        >
          {/* Subtle Warm Ambient Glow */}
          <div
            style={{
              position: "absolute",
              inset: 0,
              background:
                "radial-gradient(circle at 50% 46%, rgba(255, 99, 28, 0.12) 0%, rgba(22, 33, 47, 0.96) 60%, #16212f 100%)",
              pointerEvents: "none",
            }}
          />

          {/* Central Logo & Brand Badge */}
          <motion.div
            initial={{ opacity: 0, y: 12, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
            style={{
              position: "relative",
              zIndex: 2,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              marginBottom: "28px",
            }}
          >
            {/* Logo Badge Container */}
            <div
              style={{
                width: "92px",
                height: "92px",
                borderRadius: "18px",
                background: "rgba(255, 255, 255, 0.04)",
                border: "1px solid rgba(255, 255, 255, 0.08)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: "0 10px 30px rgba(0, 0, 0, 0.35)",
                marginBottom: "18px",
              }}
            >
              <img
                src={`${import.meta.env.BASE_URL}Garage-crm-logo.png`}
                alt="Garage CRM Logo"
                style={{
                  width: "66px",
                  height: "66px",
                  objectFit: "contain",
                  display: "block",
                }}
                draggable={false}
              />
            </div>

            {/* Brand Title */}
            <h1
              style={{
                margin: 0,
                fontSize: "21px",
                fontWeight: 800,
                letterSpacing: "0.04em",
                color: "#ffffff",
                display: "flex",
                alignItems: "center",
                gap: "5px",
                lineHeight: 1.2,
              }}
            >
              <span>GARAGE</span>
              <span style={{ color: "#ff631c" }}>CRM</span>
            </h1>

            {/* Subtitle */}
            <p
              style={{
                margin: "4px 0 0",
                fontSize: "10.5px",
                fontWeight: 600,
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                color: "#8fa2bb",
              }}
            >
              Workshop Management System
            </p>
          </motion.div>

          {/* Clean Progress Bar Container */}
          <div
            style={{
              position: "relative",
              zIndex: 2,
              width: "250px",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "10px",
            }}
          >
            {/* Progress Bar Track */}
            <div
              style={{
                width: "100%",
                height: "4px",
                borderRadius: "999px",
                background: "rgba(255, 255, 255, 0.08)",
                overflow: "hidden",
                position: "relative",
              }}
            >
              <motion.div
                style={{
                  height: "100%",
                  width: `${count}%`,
                  borderRadius: "999px",
                  background: "linear-gradient(90deg, #ff631c, #ff8c42)",
                  boxShadow: "0 0 10px rgba(255, 99, 28, 0.5)",
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
                color: "#8fa2bb",
              }}
            >
              <span>{statusText}</span>
              <span style={{ color: "#e2e8f0", fontWeight: 600 }}>{count}%</span>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

