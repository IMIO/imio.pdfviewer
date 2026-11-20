import { resolveIcon } from "./icons";

// The frame that replaces the viewer when the browser cannot show the PDF:
// a short explanation and a download button. It uses the DOM only, so it
// also works when the viewer code cannot load. `text` is the element with
// the text version of the PDF. It stays in the page, after the frame.
export const renderFallback = (el, { file, t, text = null }) => {
    const frame = document.createElement("div");
    frame.className = "pdf-viewer-fallback";
    frame.innerHTML = `
        <span class="pdf-viewer-fallback-icon" aria-hidden="true">
            <span class="pdf-viewer-icon"></span>
        </span>
        <div class="pdf-viewer-fallback-body">
            <p class="pdf-viewer-fallback-title"></p>
            <p class="pdf-viewer-fallback-text"></p>
            <a class="pdf-viewer-fallback-download" target="_blank" rel="noopener">
                <span class="pdf-viewer-icon" aria-hidden="true"></span>
                <span class="pdf-viewer-fallback-label"></span>
            </a>
        </div>`;
    frame.querySelector(".pdf-viewer-fallback-title").textContent = t(
        "Your browser cannot show this document",
    );
    frame.querySelector(".pdf-viewer-fallback-text").textContent = t(
        "Download it to read it with a PDF reader. A recent version of Chrome, Edge, Firefox or Safari shows it here.",
    );
    const link = frame.querySelector(".pdf-viewer-fallback-download");
    link.href = file;
    frame.querySelector(".pdf-viewer-fallback-label").textContent = t(
        "Download the document",
    );
    el.replaceChildren(frame, ...(text ? [text] : []));

    const [pdfIcon, downloadIcon] = frame.querySelectorAll(".pdf-viewer-icon");
    resolveIcon("file-earmark-pdf").then((svg) => (pdfIcon.innerHTML = svg));
    resolveIcon("download").then((svg) => (downloadIcon.innerHTML = svg));
};
