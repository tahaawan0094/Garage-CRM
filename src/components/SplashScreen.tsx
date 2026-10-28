import { useEffect, useState } from "react";

const SPLASH_DURATION_MS = 2500;
const FADE_OUT_DURATION_MS = 700;

function SplashScreen() {
  const [isVisible, setIsVisible] = useState(true);
  const [isFadingOut, setIsFadingOut] = useState(false);

  useEffect(() => {
    const fadeOutTimer = window.setTimeout(
      () => setIsFadingOut(true),
      SPLASH_DURATION_MS,
    );
    const hideTimer = window.setTimeout(
      () => setIsVisible(false),
      SPLASH_DURATION_MS + FADE_OUT_DURATION_MS,
    );

    return () => {
      window.clearTimeout(fadeOutTimer);
      window.clearTimeout(hideTimer);
    };
  }, []);

  if (!isVisible) {
    return null;
  }

  return (
    <div
      aria-label="Garage Workspace loading"
      className={`fixed inset-0 z-50 flex items-center justify-center bg-[#16212f] transition-opacity duration-700 ease-in-out ${
        isFadingOut ? "pointer-events-none opacity-0" : "opacity-100"
      }`}
      role="status"
    >
      <div className="flex flex-col items-center">
        <img
          alt="Garage Workspace"
          className="splash-logo block h-auto w-[min(72vw,320px)]"
          src={`${import.meta.env.BASE_URL}garage-workspace-logo.png`}
          width={205}
          height={83}
          draggable={false}
        />
        <div aria-hidden="true" className="mt-8 h-0.5 w-36 overflow-hidden rounded-full bg-white/10">
          <div className="loading-progress h-full w-full origin-left rounded-full bg-[#f15a24]" />
        </div>
      </div>
    </div>
  );
}

export default SplashScreen;
