// These URLs resolve relative to the bundle at runtime (webpack publicPath "auto").
// This module is separate because Jest cannot run import.meta. Tests mock it.
export const WORKER_SRC = new URL("pdfjs-dist/build/pdf.worker.min.mjs", import.meta.url)
    .href;
export const SPINNER_URL = new URL("./ajax-spinner.svg", import.meta.url).href;
