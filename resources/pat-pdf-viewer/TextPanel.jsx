import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { SPINNER_URL } from "./assets";

// Get the HTML fragment at `url`. The request does not leave the origin of the page.
const fetchText = async (url, signal) => {
    const response = await fetch(url, {
        mode: "same-origin",
        credentials: "same-origin",
        headers: { Accept: "text/html" },
        signal,
    });
    if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
    }
    const html = await response.text();
    if (!html.trim()) {
        throw new Error("The response has no text.");
    }
    return html;
};

// An element with the content of the fragment. The server made the HTML
// safe, so the viewer does not change it. A script in it does not run.
// The parser also accepts a full document: Plone can put a fragment in
// <html> and <body> elements.
const toElement = (html) => {
    const { body } = new DOMParser().parseFromString(html, "text/html");
    const el = document.createElement("div");
    el.append(...body.childNodes);
    return el;
};

// The panel of the text version of the PDF. `text` is the element with the
// inline text. `textUrl` gives the full text. With the two sources, the
// inline text shows first and a button loads the full text.
const TextPanel = ({ t, id, labelledBy, active, text, textUrl }) => {
    const panelRef = useRef(null);
    const contentRef = useRef(null);
    const buttonRef = useRef(null);
    const controllerRef = useRef(null);
    // The element that the panel shows.
    const [content, setContent] = useState(text);
    // State of the request: "idle", "loading", "error" or "done".
    const [status, setStatus] = useState("idle");
    // After an error, the button stays until the text loads.
    const [failed, setFailed] = useState(false);
    const loading = status === "loading";

    useLayoutEffect(() => {
        contentRef.current.replaceChildren(...(content ? [content] : []));
    }, [content]);

    useEffect(() => () => controllerRef.current?.abort(), []);

    const load = async () => {
        if (loading) {
            return;
        }
        const controller = new AbortController();
        controllerRef.current = controller;
        setStatus("loading");
        try {
            const html = await fetchText(textUrl, controller.signal);
            // The button goes away. Keep the focus of the reader in the panel.
            if (buttonRef.current && document.activeElement === buttonRef.current) {
                panelRef.current?.focus({ preventScroll: true });
            }
            setContent(toElement(html));
            setStatus("done");
        } catch {
            if (!controller.signal.aborted) {
                setFailed(true);
                setStatus("error");
            }
        }
    };

    // Without inline text, the text loads when the panel opens for the first time.
    useEffect(() => {
        if (active && !text && textUrl && status === "idle") {
            load();
        }
    }, [active]);

    const offerLoad = Boolean(textUrl) && status !== "done" && (Boolean(text) || failed);

    return (
        <div
            ref={panelRef}
            id={id}
            className="pdf-viewer-text-panel"
            role="tabpanel"
            aria-labelledby={labelledBy}
            tabIndex={0}
            hidden={!active}
        >
            <div ref={contentRef} className="pdf-viewer-text" />
            {textUrl && (
                <div className="pdf-viewer-text-more">
                    {/* This element is always in the page: a screen reader
                        reads a text that comes into it. */}
                    <div className="pdf-viewer-text-status" role="status">
                        {loading && (
                            <>
                                <img className="pdf-viewer-spinner" src={SPINNER_URL} alt="" />
                                {t("Loading the text version…")}
                            </>
                        )}
                    </div>
                    {status === "error" && (
                        <p className="pdf-viewer-text-error" role="alert">
                            {t("The text version cannot be loaded.")}
                        </p>
                    )}
                    {offerLoad && (
                        <button
                            ref={buttonRef}
                            type="button"
                            className="pdf-viewer-text-load"
                            aria-disabled={loading || undefined}
                            onClick={load}
                        >
                            {text ? t("Load the full text") : t("Try again")}
                        </button>
                    )}
                </div>
            )}
        </div>
    );
};

export default TextPanel;
