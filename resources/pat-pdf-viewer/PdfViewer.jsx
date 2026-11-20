import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { Document, pdfjs } from "react-pdf";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";
import { SPINNER_URL, WORKER_SRC } from "./assets";
import Pages from "./Pages";
import Toolbar from "./Toolbar";
import { useBoxSize } from "./useBoxSize";
import { useFullscreen } from "./useFullscreen";
import { usePinchZoom } from "./usePinchZoom";
import {
    MAX_SCALE,
    MIN_SCALE,
    fitScale,
    scaleBy,
    zoomIn,
    zoomOut,
} from "./zoom";

// react-pdf reads the worker URL in the module that renders <Document>.
pdfjs.GlobalWorkerOptions.workerSrc = WORKER_SRC;

// Space in pixels above a page after a jump to that page.
const SCROLL_MARGIN = 8;

const identity = (text) => text;

// Size of each page at scale 1, without rotation.
const readSizes = (pdf) =>
    Promise.all(
        Array.from({ length: pdf.numPages }, async (_, index) => {
            const page = await pdf.getPage(index + 1);
            const { width, height } = page.getViewport({ scale: 1, rotation: 0 });
            return { width, height, rotate: page.rotate };
        }),
    );

const ErrorMessage = ({ file, t }) => (
    <p className="pdf-viewer-error" role="alert">
        {t("The document cannot be displayed.")}{" "}
        <a href={file}>{t("Download the document")}</a>
    </p>
);

const PdfViewer = ({ file, display = "continuous", buttons = [], t = identity }) => {
    const rootRef = useRef(null);
    const viewportRef = useRef(null);
    const pagesRef = useRef(null);
    // The page at the top of the viewport and the scrolled part of it.
    // The viewer keeps this place when the size of the pages changes.
    const anchorRef = useRef(null);
    const frameRef = useRef(0);
    const [sizes, setSizes] = useState(null);
    const [failed, setFailed] = useState(false);
    const [page, setPage] = useState(1);
    const [rotation, setRotation] = useState(0);
    const [zoom, setZoom] = useState({ mode: "page-width", scale: 1 });
    const box = useBoxSize(viewportRef);
    const fullscreen = useFullscreen(rootRef);

    const numPages = sizes?.length ?? 0;
    const single = display === "single";
    // The single mode fits the current page. The continuous mode fits all the pages.
    const fitSizes = single ? sizes?.slice(page - 1, page) : sizes;
    const scale =
        zoom.mode === "custom" ? zoom.scale : fitScale(zoom.mode, fitSizes, rotation, box);

    // react-pdf also sets data-page-number on its page. Select the boxes only.
    const pageElement = (number) =>
        viewportRef.current?.querySelector(`.pdf-viewer-page[data-page-number="${number}"]`);

    const onLoadSuccess = useCallback(async (pdf) => setSizes(await readSizes(pdf)), []);

    // The current page is the page at one third of the viewport height.
    const trackScroll = () => {
        const viewport = viewportRef.current;
        if (!viewport) {
            return;
        }
        const line = viewport.scrollTop + viewport.clientHeight / 3;
        let current = null;
        for (const el of viewport.querySelectorAll(".pdf-viewer-page")) {
            if (current && el.offsetTop > line) {
                break;
            }
            current = el;
        }
        if (!current || !current.offsetHeight) {
            return;
        }
        anchorRef.current = {
            page: Number(current.dataset.pageNumber),
            offset: (viewport.scrollTop - current.offsetTop) / current.offsetHeight,
        };
        setPage(anchorRef.current.page);
    };

    const onScroll = () => {
        cancelAnimationFrame(frameRef.current);
        frameRef.current = requestAnimationFrame(trackScroll);
    };

    useEffect(() => () => cancelAnimationFrame(frameRef.current), []);

    // After a change of scale or rotation, show the same place again.
    useLayoutEffect(() => {
        const anchor = anchorRef.current;
        const el = anchor && pageElement(anchor.page);
        if (el) {
            viewportRef.current.scrollTop = el.offsetTop + anchor.offset * el.offsetHeight;
        }
    }, [scale, rotation]);

    const goToPage = (number) => {
        const target = Math.min(Math.max(number, 1), numPages);
        const viewport = viewportRef.current;
        if (!target || !viewport) {
            return;
        }
        setPage(target);
        if (single) {
            anchorRef.current = null;
            viewport.scrollTop = 0;
            return;
        }
        const el = pageElement(target);
        if (!el) {
            return;
        }
        anchorRef.current = {
            page: target,
            offset: el.offsetHeight ? -SCROLL_MARGIN / el.offsetHeight : 0,
        };
        viewport.scrollTop = el.offsetTop - SCROLL_MARGIN;
    };

    // react-pdf keeps the first onItemClick callback. This callback does not
    // change. It calls the goToPage function of the last render.
    const goToPageRef = useRef(goToPage);
    useLayoutEffect(() => {
        goToPageRef.current = goToPage;
    });
    const onItemClick = useCallback(({ pageNumber }) => goToPageRef.current(pageNumber), []);

    const setScale = (next) => setZoom({ mode: "custom", scale: next });

    usePinchZoom(viewportRef, {
        // Scale the pages with CSS while the fingers move. Render them at the end.
        onPinch: (ratio) => {
            const viewport = viewportRef.current;
            const pages = pagesRef.current;
            if (!pages) {
                return;
            }
            const x = viewport.scrollLeft + viewport.clientWidth / 2;
            const y = viewport.scrollTop + viewport.clientHeight / 2;
            pages.style.transformOrigin = `${x}px ${y}px`;
            pages.style.transform = `scale(${ratio})`;
        },
        onPinchEnd: (ratio) => {
            if (pagesRef.current) {
                pagesRef.current.style.transform = "";
            }
            setScale(scaleBy(scale, ratio));
        },
        onDoubleTap: () => {
            if (zoom.mode === "page-width") {
                setScale(scaleBy(scale, 2));
            } else {
                setZoom({ mode: "page-width", scale });
            }
        },
    });

    const actions = {
        previous: () => goToPage(page - 1),
        next: () => goToPage(page + 1),
        print: async () => {
            const { default: printJS } = await import("print-js-updated");
            printJS({ printable: file, type: "pdf" });
        },
        rotate: () => setRotation((current) => (current + 90) % 360),
        toggleFit: () =>
            setZoom({ mode: zoom.mode === "page-width" ? "page-fit" : "page-width", scale }),
        zoomIn: () => setScale(zoomIn(scale)),
        zoomOut: () => setScale(zoomOut(scale)),
        toggleFullscreen: fullscreen.toggle,
    };

    // The keys work when the focus is in the viewer. In continuous mode, the
    // browser scrolls with the arrows and the page keys.
    const onKeyDown = (event) => {
        if (event.ctrlKey || event.metaKey || event.altKey || !numPages) {
            return;
        }
        const keys = {
            "+": actions.zoomIn,
            "=": actions.zoomIn,
            "-": actions.zoomOut,
            ...(single && {
                ArrowLeft: actions.previous,
                PageUp: actions.previous,
                ArrowRight: actions.next,
                PageDown: actions.next,
            }),
        };
        const action = keys[event.key];
        if (action) {
            event.preventDefault();
            action();
        }
    };

    return (
        <section
            ref={rootRef}
            className={[
                "pdf-viewer",
                fullscreen.mode && "pdf-viewer-fullscreen",
                fullscreen.mode === "fallback" && "pdf-viewer-fullscreen-fallback",
            ]
                .filter(Boolean)
                .join(" ")}
            aria-label={t("PDF document")}
            onKeyDown={onKeyDown}
        >
            {numPages > 0 && !failed && (
                <Toolbar
                    t={t}
                    file={file}
                    buttons={buttons}
                    page={page}
                    numPages={numPages}
                    zoom={zoom}
                    scale={scale}
                    canZoomIn={scale < MAX_SCALE}
                    canZoomOut={scale > MIN_SCALE}
                    isFullscreen={fullscreen.mode !== null}
                    actions={actions}
                />
            )}
            <div
                ref={viewportRef}
                className="pdf-viewer-viewport"
                tabIndex={0}
                onScroll={onScroll}
            >
                <Document
                    file={file}
                    inputRef={pagesRef}
                    className="pdf-viewer-pages"
                    suspense={false}
                    loading={
                        <img
                            className="pdf-viewer-spinner"
                            src={SPINNER_URL}
                            alt={t("Loading the document…")}
                        />
                    }
                    error={<ErrorMessage file={file} t={t} />}
                    onLoadSuccess={onLoadSuccess}
                    onLoadError={() => setFailed(true)}
                    onItemClick={onItemClick}
                    externalLinkTarget="_blank"
                    externalLinkRel="noopener noreferrer"
                >
                    {sizes && (
                        <Pages
                            viewportRef={viewportRef}
                            sizes={sizes}
                            display={display}
                            page={page}
                            scale={scale}
                            rotation={rotation}
                        />
                    )}
                </Document>
            </div>
        </section>
    );
};

export default PdfViewer;
