import Pattern from "./pdf-viewer";
import utils from "@patternslib/patternslib/src/core/utils";
import printJS from "print-js-updated";

// jsdom has no canvas and cannot run pdf.js. Mock at the hook boundary.
jest.mock("./assets", () => ({ WORKER_SRC: "worker.mjs", SPINNER_URL: "spinner.svg" }));
jest.mock("@mikecousins/react-pdf", () => ({
    usePdf: () => ({ pdfDocument: { numPages: 3 }, pdfPage: {} }),
}));
jest.mock("print-js-updated", () => jest.fn());

const PDF_URL = "https://example.org/doc/@@download/file/report.pdf";

// Let the pattern init, the lazy imports and the React render complete.
const settle = async () => {
    for (let i = 0; i < 5; i++) {
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

const button = (el, title) => el.querySelector(`button[title="${title}"]`);

describe("pat-pdf-viewer", () => {
    beforeEach(() => {
        document.body.innerHTML = "";
        jest.clearAllMocks();
    });

    it("mounts from a child link", async () => {
        const { el } = await mount(`
            <div class="pat-pdf-viewer">
                <a href="${PDF_URL}">Télécharger le document</a>
            </div>
        `);

        expect(el.querySelector(".pdf-viewer .pdf-viewer-toolbar")).toBeTruthy();
        expect(el.querySelector(".pdf-viewer-page-count").textContent).toBe("1 / 3");
        const download = el.querySelector('a[title="Télécharger le document"]');
        expect(download.getAttribute("href")).toBe(PDF_URL);
        expect(download.getAttribute("target")).toBe("_blank");
        expect(el.querySelector("canvas").classList.contains("pdf-full-width")).toBe(
            true,
        );
    });

    it("mounts from the url option", async () => {
        const { el } = await mount(`
            <div class="pat-pdf-viewer" data-pat-pdf-viewer='{"url": "${PDF_URL}"}'></div>
        `);

        expect(el.querySelector(".pdf-viewer-page-count").textContent).toBe("1 / 3");
        expect(
            el.querySelector('a[title="Télécharger le document"]').getAttribute("href"),
        ).toBe(PDF_URL);
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
            <div class="pat-pdf-viewer"><a href="${PDF_URL}">PDF</a></div>
        `);
        const count = () => el.querySelector(".pdf-viewer-page-count").textContent;

        expect(button(el, "Page précédente").disabled).toBe(true);
        expect(button(el, "Page suivante").disabled).toBe(false);

        button(el, "Page suivante").click();
        await settle();
        expect(count()).toBe("2 / 3");

        button(el, "Page suivante").click();
        await settle();
        expect(count()).toBe("3 / 3");
        expect(button(el, "Page suivante").disabled).toBe(true);

        button(el, "Page précédente").click();
        await settle();
        expect(count()).toBe("2 / 3");
        expect(button(el, "Page précédente").disabled).toBe(false);
    });

    it("prints the document", async () => {
        const { el } = await mount(`
            <div class="pat-pdf-viewer"><a href="${PDF_URL}">PDF</a></div>
        `);

        button(el, "Imprimer le document").click();
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
