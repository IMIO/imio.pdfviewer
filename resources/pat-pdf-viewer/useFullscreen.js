import { useCallback, useEffect, useRef, useState } from "react";

// Make the page around `el` inert: the siblings of `el` and of each of its
// ancestors up to <body>. Return a function that removes `inert` from these
// elements only. An element that is already inert stays inert.
const makePageInert = (el) => {
    const changed = [];
    for (let node = el; node && node !== document.body; node = node.parentElement) {
        for (const sibling of node.parentElement?.children ?? []) {
            if (sibling !== node && !sibling.hasAttribute("inert")) {
                sibling.setAttribute("inert", "");
                changed.push(sibling);
            }
        }
    }
    return () => changed.forEach((sibling) => sibling.removeAttribute("inert"));
};

// Show an element in full screen. The Fullscreen API comes first. When the
// browser refuses it (for example on iPhone), the element covers the window.
// The page under it does not scroll and does not get the focus.
// The mode is null, "native" or "fallback".
// Use `toggle` as the click handler of the full screen button: when the
// fallback closes, the button gets the focus again.
export const useFullscreen = (ref) => {
    const [mode, setMode] = useState(null);
    const openerRef = useRef(null);

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

    // In fallback mode, lock the page, and close with the Escape key.
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
        const restorePage = makePageInert(ref.current);
        root.classList.add("pdf-viewer-scroll-lock");
        document.addEventListener("keydown", onKeyDown);
        return () => {
            restorePage();
            root.classList.remove("pdf-viewer-scroll-lock");
            document.removeEventListener("keydown", onKeyDown);
            if (openerRef.current?.isConnected) {
                openerRef.current.focus();
            }
        };
    }, [mode, ref]);

    const toggle = useCallback(
        async (event) => {
            if (mode === "native") {
                await document.exitFullscreen();
                return;
            }
            if (mode === "fallback") {
                setMode(null);
                return;
            }
            openerRef.current = event?.currentTarget ?? null;
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
        },
        [mode, ref],
    );

    return { mode, toggle };
};
