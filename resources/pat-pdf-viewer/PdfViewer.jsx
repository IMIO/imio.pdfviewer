import {
    useCallback,
    useEffect,
    useId,
    useLayoutEffect,
    useMemo,
    useRef,
    useState,
} from "react";
import { Document, pdfjs } from "react-pdf";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";
import { PDFJS_OPTIONS, SPINNER_URL, WORKER_SRC } from "./assets";
import Icon from "./Icon";
import Pages from "./Pages";
import Tabs, { PDF_TAB, TEXT_TAB, readTab, saveTab } from "./Tabs";
import TextPanel from "./TextPanel";
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
// The viewer reads the page sizes in groups of this number of pages.
const SIZE_BATCH = 50;

const identity = (text) => text;

// Size of a page at scale 1, without rotation.
const readSize = async (pdf, number) => {
    const page = await pdf.getPage(number);
    const { width, height } = page.getViewport({ scale: 1, rotation: 0 });
    return { width, height, rotate: page.rotate };
};

// The page numbers in groups: page 1 alone, then groups of SIZE_BATCH pages.
const sizeGroups = (numPages) => {
    const groups = [[1]];
    for (let first = 2; first <= numPages; first += SIZE_BATCH) {
        const count = Math.min(SIZE_BATCH, numPages - first + 1);
        groups.push(Array.from({ length: count }, (_, index) => first + index));
    }
    return groups;
};

// The same frame as fallback.js, for a PDF that cannot load.
const ErrorMessage = ({ file, t }) => (
    <div className="pdf-viewer-fallback" role="alert">
        <span className="pdf-viewer-fallback-icon" aria-hidden="true">
            <Icon name="file-earmark-pdf" />
        </span>
        <div className="pdf-viewer-fallback-body">
            <p className="pdf-viewer-fallback-title">{t("The document cannot be displayed.")}</p>
            <p className="pdf-viewer-fallback-text">
                {t("Download it to read it with a PDF reader.")}
            </p>
            <a className="pdf-viewer-fallback-download" href={file} target="_blank" rel="noopener">
                <Icon name="download" />
                <span className="pdf-viewer-fallback-label">{t("Download the document")}</span>
            </a>
        </div>
    </div>
);

// `text` is an element with the text version of the PDF. `textUrl` is the
// URL of an HTML fragment with that text. With one of them, the viewer has
// two tabs: the PDF and its text version.
const PdfViewer = ({
    file,
    display = "continuous",
    buttons = [],
    text = null,
    textUrl = null,
    t = identity,
}) => {
    const uid = useId();
    const rootRef = useRef(null);
    const viewportRef = useRef(null);
    const pagesRef = useRef(null);
    // The place of the reader: the page at one third of the viewport height,
    // the scrolled part of it (`offset`) and the scrolled part of the gap
    // above it in pixels (`gap`, 0 or less). The viewer keeps this place when
    // the size of the pages changes. After the viewer scrolls to a place,
    // `top` is the scroll position of this place.
    const anchorRef = useRef(null);
    const frameRef = useRef(0);
    // The open document and the page sizes that the viewer read, by page index.
    const [doc, setDoc] = useState({ pdf: null, sizes: [] });
    const [failed, setFailed] = useState(false);
    const [page, setPage] = useState(1);
    const [rotation, setRotation] = useState(0);
    const [zoom, setZoom] = useState({ mode: "page-width", scale: 1 });
    const box = useBoxSize(viewportRef);
    const fullscreen = useFullscreen(rootRef);
    const hasText = Boolean(text || textUrl);
    // The PDF tab opens first. The last tab of the reader replaces it.
    const [tab, setTab] = useState(() => (hasText && readTab()) || PDF_TAB);
    const textActive = hasText && tab === TEXT_TAB;
    // The PDF loads when its tab opens for the first time.
    const [pdfOpened, setPdfOpened] = useState(!textActive);

    const { pdf } = doc;
    const numPages = pdf?.numPages ?? 0;
    // A page with no size yet gets the size of the first page that the viewer read.
    const sizes = useMemo(() => {
        const estimate = doc.sizes.find(Boolean);
        return estimate
            ? Array.from({ length: numPages }, (_, index) => doc.sizes[index] ?? estimate)
            : null;
    }, [doc, numPages]);
    const ready = sizes !== null && !failed;
    const single = display === "single";
    // The single mode fits the current page. The continuous mode fits all the pages.
    const fitSizes = single ? sizes?.slice(page - 1, page) : sizes;
    const scale =
        zoom.mode === "custom" ? zoom.scale : fitScale(zoom.mode, fitSizes, rotation, box);

    // react-pdf also sets data-page-number on its page. Select the boxes only.
    const pageElement = (number) =>
        viewportRef.current?.querySelector(`.pdf-viewer-page[data-page-number="${number}"]`);

    const onLoadSuccess = useCallback(
        (next) =>
            setDoc((current) => (current.pdf === next ? current : { pdf: next, sizes: [] })),
        [],
    );

    // Keep the sizes of the pages `numbers` of the document `from`.
    const addSizes = (from, numbers, read) => {
        saveAnchor();
        setDoc((current) => {
            if (current.pdf !== from) {
                return current;
            }
            const next = [...current.sizes];
            numbers.forEach((number, index) => {
                next[number - 1] = read[index];
            });
            return { pdf: from, sizes: next };
        });
    };

    // In continuous mode, read all the page sizes in page order. Page 1 shows
    // before the viewer knows the other sizes.
    useEffect(() => {
        if (!pdf || single) {
            return undefined;
        }
        let active = true;
        const load = async () => {
            for (const numbers of sizeGroups(pdf.numPages)) {
                const read = await Promise.all(numbers.map((number) => readSize(pdf, number)));
                if (!active) {
                    return;
                }
                addSizes(pdf, numbers, read);
            }
        };
        load().catch(() => active && setFailed(true));
        return () => {
            active = false;
        };
    }, [pdf, single]);

    // In single mode, read the size of the current page only.
    const pageKnown = Boolean(doc.sizes[page - 1]);
    useEffect(() => {
        if (!pdf || !single || pageKnown) {
            return undefined;
        }
        let active = true;
        readSize(pdf, page).then(
            (size) => active && addSizes(pdf, [page], [size]),
            () => active && setFailed(true),
        );
        return () => {
            active = false;
        };
    }, [pdf, single, page, pageKnown]);

    // Save the place of the reader before a change of the page geometry. The
    // scroll tracker can be one frame late. If the reader did not scroll
    // after the viewer scrolled to a place, the viewer keeps that place: the
    // scroll limit can stop a page before it gets to the top.
    const saveAnchor = () => {
        const viewport = viewportRef.current;
        if (!viewport) {
            return null;
        }
        const anchor = anchorRef.current;
        if (anchor?.top !== undefined && Math.abs(viewport.scrollTop - anchor.top) < 1) {
            return anchor;
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
            return null;
        }
        // The gap between the pages does not change with the scale.
        const above = viewport.scrollTop - current.offsetTop;
        anchorRef.current = {
            page: Number(current.dataset.pageNumber),
            offset: Math.max(above, 0) / current.offsetHeight,
            gap: Math.min(above, 0),
        };
        return anchorRef.current;
    };

    // The current page is the page of the place of the reader.
    const trackScroll = () => {
        const anchor = saveAnchor();
        if (anchor) {
            setPage(anchor.page);
        }
    };

    // Scroll to the place `anchor`.
    const showAnchor = (anchor) => {
        const viewport = viewportRef.current;
        const el = pageElement(anchor.page);
        if (!viewport || !el) {
            return;
        }
        const top = el.offsetTop + anchor.offset * el.offsetHeight + anchor.gap;
        if (Math.abs(viewport.scrollTop - top) >= 1) {
            viewport.scrollTop = top;
        }
        anchorRef.current = { ...anchor, top: viewport.scrollTop };
    };

    const onScroll = () => {
        cancelAnimationFrame(frameRef.current);
        frameRef.current = requestAnimationFrame(trackScroll);
    };

    useEffect(() => () => cancelAnimationFrame(frameRef.current), []);

    // After a change of scale, rotation or page sizes, show the same place again.
    useLayoutEffect(() => {
        if (anchorRef.current) {
            showAnchor(anchorRef.current);
        }
    }, [scale, rotation, sizes]);

    // A hidden viewport can lose its scroll position. Show the same place
    // again when the PDF tab opens.
    useLayoutEffect(() => {
        if (!textActive && anchorRef.current) {
            showAnchor(anchorRef.current);
        }
    }, [textActive]);

    const selectTab = (name) => {
        if (name === tab) {
            return;
        }
        // Keep the place of the reader in the PDF.
        saveAnchor();
        setTab(name);
        saveTab(name);
        if (name === PDF_TAB) {
            setPdfOpened(true);
        }
    };

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
        showAnchor({ page: target, offset: 0, gap: -SCROLL_MARGIN });
    };

    // react-pdf keeps the first onItemClick callback. This callback does not
    // change. It calls the goToPage function of the last render.
    const goToPageRef = useRef(goToPage);
    useLayoutEffect(() => {
        goToPageRef.current = goToPage;
    });
    const onItemClick = useCallback(({ pageNumber }) => goToPageRef.current(pageNumber), []);

    const changeZoom = (next) => {
        saveAnchor();
        setZoom(next);
    };
    const setScale = (next) => changeZoom({ mode: "custom", scale: next });

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
                changeZoom({ mode: "page-width", scale });
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
        rotate: () => {
            saveAnchor();
            setRotation((current) => (current + 90) % 360);
        },
        toggleFit: () =>
            changeZoom({ mode: zoom.mode === "page-width" ? "page-fit" : "page-width", scale }),
        zoomIn: () => setScale(zoomIn(scale)),
        zoomOut: () => setScale(zoomOut(scale)),
        toggleFullscreen: fullscreen.toggle,
    };

    // The keys work when the focus is in the viewer. In continuous mode, the
    // browser scrolls with the arrows and the page keys.
    const onKeyDown = (event) => {
        if (event.ctrlKey || event.metaKey || event.altKey || !ready || textActive) {
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

    const isFullscreen = fullscreen.mode !== null;
    const tabs = [
        {
            name: PDF_TAB,
            label: t("Document"),
            icon: "file-earmark-pdf",
            id: `${uid}-pdf-tab`,
            panel: `${uid}-pdf-panel`,
        },
        {
            name: TEXT_TAB,
            label: t("Text version"),
            icon: "file-earmark-text",
            id: `${uid}-text-tab`,
            panel: `${uid}-text-panel`,
        },
    ];
    // The text tab needs no loaded PDF for its buttons.
    const toolbarShown = textActive
        ? ["download", "print"].some((name) => buttons.includes(name)) ||
          (isFullscreen && buttons.includes("fullscreen"))
        : ready;
    const toolbar = toolbarShown && (
        <Toolbar
            t={t}
            file={file}
            buttons={buttons}
            pdfControls={!textActive}
            page={page}
            numPages={numPages}
            zoom={zoom}
            canZoomIn={scale < MAX_SCALE}
            canZoomOut={scale > MIN_SCALE}
            isFullscreen={isFullscreen}
            actions={actions}
        />
    );

    return (
        <section
            ref={rootRef}
            className={[
                "pdf-viewer",
                textActive && "pdf-viewer-text-active",
                fullscreen.mode && "pdf-viewer-fullscreen",
                fullscreen.mode === "fallback" && "pdf-viewer-fullscreen-fallback",
            ]
                .filter(Boolean)
                .join(" ")}
            aria-label={t("PDF document")}
            onKeyDown={onKeyDown}
        >
            {hasText ? (
                <div className="pdf-viewer-header">
                    <Tabs t={t} tabs={tabs} active={tab} onChange={selectTab} />
                    {toolbar}
                </div>
            ) : (
                toolbar
            )}
            <div
                ref={viewportRef}
                className="pdf-viewer-viewport"
                tabIndex={0}
                onScroll={onScroll}
                {...(hasText && {
                    "id": tabs[0].panel,
                    "role": "tabpanel",
                    "aria-labelledby": tabs[0].id,
                    "hidden": textActive,
                })}
            >
                {pdfOpened && (
                    <Document
                        file={file}
                        options={PDFJS_OPTIONS}
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
                        {failed ? (
                            <ErrorMessage file={file} t={t} />
                        ) : (
                            sizes && (
                                <Pages
                                    viewportRef={viewportRef}
                                    sizes={sizes}
                                    display={display}
                                    page={page}
                                    scale={scale}
                                    rotation={rotation}
                                />
                            )
                        )}
                    </Document>
                )}
            </div>
            {hasText && (
                <TextPanel
                    t={t}
                    id={tabs[1].panel}
                    labelledBy={tabs[1].id}
                    active={textActive}
                    text={text}
                    textUrl={textUrl}
                />
            )}
        </section>
    );
};

export default PdfViewer;
