import { useCallback, useEffect, useState } from "react";

// Show an element in full screen. The Fullscreen API comes first. When the
// browser refuses it (for example on iPhone), the element covers the window
// and the page under it does not scroll.
// The mode is null, "native" or "fallback".
export const useFullscreen = (ref) => {
    const [mode, setMode] = useState(null);

    // Follow the browser: the Escape key also stops the native full screen.
    useEffect(() => {
        const sync = () => {
            const active = document.fullscreenElement === ref.current;
            setMode((current) => {
                if (active) {
                    return "native";
                }
                return current === "native" ? null : current;
            });
        };
        document.addEventListener("fullscreenchange", sync);
        return () => document.removeEventListener("fullscreenchange", sync);
    }, [ref]);

    // In fallback mode, lock the page scroll and close with the Escape key.
    useEffect(() => {
        if (mode !== "fallback") {
            return undefined;
        }
        const root = document.documentElement;
        const onKeyDown = (event) => {
            if (event.key === "Escape") {
                setMode(null);
            }
        };
        root.classList.add("pdf-viewer-scroll-lock");
        document.addEventListener("keydown", onKeyDown);
        return () => {
            root.classList.remove("pdf-viewer-scroll-lock");
            document.removeEventListener("keydown", onKeyDown);
        };
    }, [mode]);

    const toggle = useCallback(async () => {
        if (mode === "native") {
            await document.exitFullscreen();
            return;
        }
        if (mode === "fallback") {
            setMode(null);
            return;
        }
        const el = ref.current;
        if (!el.requestFullscreen || !document.fullscreenEnabled) {
            setMode("fallback");
            return;
        }
        try {
            await el.requestFullscreen();
            setMode("native");
        } catch {
            setMode("fallback");
        }
    }, [mode, ref]);

    return { mode, toggle };
};
