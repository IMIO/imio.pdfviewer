import Pattern from "./pdf-viewer";
import utils from "@patternslib/patternslib/src/core/utils";
import printJS from "print-js-updated";

// jsdom has no canvas and cannot run pdf.js. Mock react-pdf.
jest.mock("./assets", () => ({
    WORKER_SRC: "worker.mjs",
    SPINNER_URL: "spinner.svg",
    PDFJS_OPTIONS: {},
}));
jest.mock("react-pdf", () => {
    const { createElement, useEffect } = require("react");
    const pdf = {
        numPages: 3,
        getPage: async () => ({
            rotate: 0,
            getViewport: () => ({ width: 600, height: 800 }),
        }),
    };
    return {
        pdfjs: { GlobalWorkerOptions: {} },
        Document: ({ children, className, onLoadSuccess }) => {
            useEffect(() => {
                onLoadSuccess(pdf);
            }, []);
            return createElement("div", { className }, children);
        },
        Page: ({ pageNumber }) => createElement("canvas", { "data-page": pageNumber }),
    };
});
jest.mock("print-js-updated", () => jest.fn());

// The ResizeObserver stub of @patternslib/dev has no disconnect method.
global.ResizeObserver = class {
    observe() {}
    disconnect() {}
};

const PDF_URL = "https://example.org/doc/@@download/file/report.pdf";

// Let the pattern init, the lazy imports and the React renders complete.
const settle = async () => {
    for (let i = 0; i < 10; i++) {
        await utils.timeout(10);
    }
};

const mount = async (html) => {
    document.body.innerHTML = html;
    const el = document.querySelector(".pat-pdf-viewer");
    const instance = new Pattern(el);
    await settle();
    return { el, instance };
};

const button = (el, label) => el.querySelector(`[aria-label="${label}"]`);
const count = (el) => el.querySelector(".pdf-viewer-page-count [aria-hidden]").textContent;

describe("pat-pdf-viewer", () => {
    beforeEach(() => {
        document.body.innerHTML = "";
        jest.clearAllMocks();
    });

    it("mounts from a child link", async () => {
        const { el } = await mount(`
            <div class="pat-pdf-viewer">
                <a href="${PDF_URL}">Download the document</a>
            </div>
        `);

        expect(el.querySelector(".pdf-viewer [role=toolbar]")).toBeTruthy();
        expect(count(el)).toBe("1 / 3");
        const download = button(el, "Download");
        expect(download.getAttribute("href")).toBe(PDF_URL);
        expect(download.getAttribute("target")).toBe("_blank");
        expect(el.querySelectorAll(".pdf-viewer-page")).toHaveLength(3);
    });

    it("mounts from the url option", async () => {
        const { el } = await mount(`
            <div class="pat-pdf-viewer" data-pat-pdf-viewer='{"url": "${PDF_URL}"}'></div>
        `);

        expect(count(el)).toBe("1 / 3");
        expect(button(el, "Download").getAttribute("href")).toBe(PDF_URL);
    });

    it("warns and renders nothing without a url", async () => {
        const warn = jest.spyOn(console, "warn").mockImplementation(() => {});

        const { el } = await mount(`<div class="pat-pdf-viewer"></div>`);

        expect(el.innerHTML).toBe("");
        expect(warn).toHaveBeenCalled();
        expect(String(warn.mock.calls[0])).toContain("No PDF url");
        warn.mockRestore();
    });

    it("changes the page inside the bounds", async () => {
        const { el } = await mount(`
            <div class="pat-pdf-viewer" data-pat-pdf-viewer='{"display": "single"}'>
                <a href="${PDF_URL}">PDF</a>
            </div>
        `);

        expect(el.querySelectorAll(".pdf-viewer-page")).toHaveLength(1);
        expect(button(el, "Previous page").disabled).toBe(true);
        expect(button(el, "Next page").disabled).toBe(false);

        button(el, "Next page").click();
        await settle();
        expect(count(el)).toBe("2 / 3");

        button(el, "Next page").click();
        await settle();
        expect(count(el)).toBe("3 / 3");
        expect(button(el, "Next page").disabled).toBe(true);

        button(el, "Previous page").click();
        await settle();
        expect(count(el)).toBe("2 / 3");
        expect(button(el, "Previous page").disabled).toBe(false);
    });

    it("prints the document", async () => {
        const { el } = await mount(`
            <div class="pat-pdf-viewer"><a href="${PDF_URL}">PDF</a></div>
        `);

        button(el, "Print").click();
        await settle();

        expect(printJS).toHaveBeenCalledWith({ printable: PDF_URL, type: "pdf" });
    });

    it("unmounts on destroy", async () => {
        const { el, instance } = await mount(`
            <div class="pat-pdf-viewer"><a href="${PDF_URL}">PDF</a></div>
        `);
        expect(el.querySelector(".pdf-viewer")).toBeTruthy();

        instance.destroy();

        expect(el.innerHTML).toBe("");
        expect(el["pattern-pdf-viewer"]).toBeUndefined();
    });
});
