import { useState, useRef, useEffect } from "react";
import { usePdf } from "@mikecousins/react-pdf";
import { WORKER_SRC, SPINNER_URL } from "./assets";

const PdfViewer = ({ file }) => {
    const [page, setPage] = useState(1);
    const [rotate, setRotate] = useState(0);
    const [scale, setScale] = useState(1);
    const [fullWidth, setFullWidth] = useState(true);
    const [fullScreen, setfullScreen] = useState(false);
    const [scrollingOver, setScrollingOver] = useState(false);
    const canvasRef = useRef(null);

    const { pdfDocument, pdfPage } = usePdf({
        file,
        page,
        rotate,
        scale: scale * 2,
        canvasRef,
        workerSrc: WORKER_SRC,
    });

    useEffect(() => {
        const handleScroll = () => {
            if (canvasRef.current) {
                const rect = canvasRef.current.getBoundingClientRect();
                setScrollingOver(rect.top < 150 && rect.bottom > 0);
            }
        };
        handleScroll();
        window.addEventListener("scroll", handleScroll);
        return () => window.removeEventListener("scroll", handleScroll);
    }, []);

    const handlePrint = async () => {
        const { default: printJS } = await import("print-js-updated");
        printJS({ printable: file, type: "pdf" });
    };

    const handleFullWidth = (event) => {
        if (fullWidth) {
            setScale(1);
            setTimeout(() => setFullWidth(false), 100); // Avoid flickering effect
        } else {
            setFullWidth(true);
            setScale(3);
        }
    };

    const handleFullScreen = () => {
        setScrollingOver(false);
        setfullScreen(!fullScreen);
    };

    const handleScaleIncrease = (event) => {
        if (fullWidth) {
            setScale(2);
            setTimeout(() => setFullWidth(false), 100); // Avoid flickering effect
        } else if (!isMaxScale(scale)) {
            setScale(scale + 0.25);
        }
    };

    const handleScaleDecrease = (event) => {
        if (fullWidth) {
            setScale(0.75);
            setTimeout(() => setFullWidth(false), 100); // Avoid flickering effect
        } else if (!isMinScale(scale)) {
            setScale(scale - 0.25);
        }
    };

    const isMaxScale = (scale) => scale >= 3;

    const isMinScale = (scale) => scale <= 0.25;

    return (
        <>
            <div className={`pdf-viewer  ${fullScreen ? "pdf-viewer-full-screen" : ""}`}>
                {Boolean(pdfDocument && pdfDocument.numPages) && (
                    <nav
                        className={`pdf-viewer-toolbar ${
                            !fullScreen && scrollingOver ? "fixed-toolbar" : ""
                        }`}
                    >
                        <div className="pdf-viewer-toolbar-left">
                            <div className="btn-group">
                                <a
                                    className="btn"
                                    href={file}
                                    target="_blank"
                                    rel="noopener"
                                    title="Télécharger le document"
                                >
                                    <i className="bi bi-file-earmark-arrow-down"></i>
                                </a>
                                <button
                                    className="btn"
                                    onClick={handlePrint}
                                    title="Imprimer le document"
                                >
                                    <i className="bi bi-printer"></i>
                                </button>
                            </div>
                        </div>

                        <div className="pdf-viewer-toolbar-center">
                            <button
                                className="btn"
                                disabled={page === 1}
                                onClick={() => setPage(page - 1)}
                                key={page - 1}
                                title="Page précédente"
                            >
                                <i className="bi bi-chevron-left"></i>
                            </button>

                            <div className="pdf-viewer-page-count">
                                {page} / {pdfDocument.numPages}
                            </div>

                            <button
                                className="btn"
                                disabled={page === pdfDocument.numPages}
                                onClick={() => setPage(page + 1)}
                                key={page + 1}
                                title="Page suivante"
                            >
                                <i className="bi bi-chevron-right"></i>
                            </button>
                        </div>
                        <div className="pdf-viewer-toolbar-right">
                            <div
                                className="btn-group border-end"
                                role="group"
                                aria-label="Basic example"
                            >
                                <button
                                    className="btn"
                                    onClick={() => setRotate(rotate + 90)}
                                    title="Tourner la page"
                                >
                                    <i className="bi bi-arrow-clockwise"></i>
                                </button>
                            </div>

                            {!fullWidth && (
                                <div className="btn-group border-end">
                                    <button
                                        className="btn"
                                        onClick={handleFullWidth}
                                        title="Pleine largeur"
                                    >
                                        <i className="bi bi-arrows-expand-vertical"></i>
                                    </button>
                                </div>
                            )}

                            {fullWidth && (
                                <div className="btn-group border-end">
                                    <button
                                        className="btn"
                                        onClick={handleFullWidth}
                                        title="Réduire"
                                    >
                                        <i className="bi bi-arrows-collapse-vertical"></i>
                                    </button>
                                </div>
                            )}
                            <div className="btn-group border-end" role="group">
                                <button
                                    className="btn"
                                    onClick={handleScaleIncrease}
                                    title="Zoomer"
                                >
                                    <i className="bi bi-plus-lg"></i>
                                </button>
                                <button
                                    className="btn"
                                    onClick={handleScaleDecrease}
                                    title="Dézoomer"
                                >
                                    <i className="bi bi-dash-lg"></i>
                                </button>
                            </div>
                            <div className="btn-group" role="group">
                                {!fullScreen && (
                                    <button
                                        className="btn"
                                        onClick={handleFullScreen}
                                        title="Plein écran"
                                    >
                                        <i className="bi bi-arrows-fullscreen"></i>
                                    </button>
                                )}
                                {fullScreen && (
                                    <button
                                        className="btn"
                                        onClick={handleFullScreen}
                                        title="Fermer"
                                    >
                                        <i className="bi bi-x-lg"></i>
                                    </button>
                                )}
                            </div>
                        </div>
                    </nav>
                )}
                <div className="pdf-viewer-page-viewport">
                    <div className="pdf-viewer-page-container">
                        {!pdfDocument && (
                            <img src={SPINNER_URL} alt="loading..." />
                        )}
                        {pdfDocument && (
                            <canvas className={fullWidth ? "pdf-full-width" : ""} ref={canvasRef} />
                        )}
                    </div>
                </div>
            </div>
            {fullScreen && (
                <button
                    className="pdf-viewer-full-screen-overlay"
                    onClick={handleFullScreen}
                ></button>
            )}
        </>
    );
};



export default PdfViewer;
