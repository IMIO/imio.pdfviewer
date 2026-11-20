/* global __webpack_public_path__ */
// These URLs resolve relative to the bundle at runtime (webpack publicPath "auto").
// This module is separate because Jest cannot run import.meta. Tests mock it.
export const WORKER_SRC = new URL(
    "pdfjs-dist/legacy/build/pdf.worker.min.mjs",
    import.meta.url,
).href;
export const SPINNER_URL = new URL("./ajax-spinner.svg", import.meta.url).href;

// The build copies the resources of pdf.js into the "pdfjs" folder of the
// bundle (see webpack.config.js). __webpack_public_path__ is the URL of the
// bundle folder at runtime. import.meta.url cannot give a folder: webpack
// writes the build path there.
const PDFJS_URL = new URL("pdfjs/", new URL(__webpack_public_path__, document.baseURI))
    .href;

// Options for pdf.js getDocument(). One object for all documents: react-pdf
// loads the document again when the options object changes.
export const PDFJS_OPTIONS = {
    cMapUrl: `${PDFJS_URL}cmaps/`,
    iccUrl: `${PDFJS_URL}iccs/`,
    standardFontDataUrl: `${PDFJS_URL}standard_fonts/`,
    wasmUrl: `${PDFJS_URL}wasm/`,
};
