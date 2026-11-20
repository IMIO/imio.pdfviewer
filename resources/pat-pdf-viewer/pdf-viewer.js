import { BasePattern } from "@patternslib/patternslib/src/core/basepattern";
import Parser from "@patternslib/patternslib/src/core/parser";
import registry from "@patternslib/patternslib/src/core/registry";
import logging from "@patternslib/patternslib/src/core/logging";
import { renderFallback } from "./fallback";
import { loadTranslations } from "./i18n";
import { readSiteSettings, resolveOptions } from "./settings";
import { isSupported } from "./supported";

const log = logging.getLogger("pdf-viewer");

export const parser = new Parser("pdf-viewer");
parser.addArgument("url", null);
// "continuous" or "single".
parser.addArgument("display", null);
// A list, or a text with names separated by spaces or commas.
parser.addArgument("buttons", null);

class Pattern extends BasePattern {
    static name = "pdf-viewer";
    static trigger = ".pat-pdf-viewer";
    static parser = parser;

    #destroyed = false;

    async init() {
        import("./pdf-viewer.scss");

        // The `url` option comes first. The child link is the fallback.
        // A link also works without JavaScript and needs no escaping.
        const url = this.options.url || this.el.querySelector("a[href]")?.href;
        if (!url) {
            log.warn("No PDF url: set the `url` option or add a child <a href>.", this.el);
            return;
        }
        // The options of the element replace the site settings.
        const options = resolveOptions(readSiteSettings(), this.options);

        // The catalog loads while the viewer code loads.
        const translations = loadTranslations();
        // A browser that cannot show the PDF gets a frame with a download button.
        const showFallback = async () => {
            const t = await translations;
            if (!this.#destroyed) {
                renderFallback(this.el, { file: url, t });
            }
        };
        if (!isSupported()) {
            await showFallback();
            return;
        }

        let modules;
        try {
            modules = await Promise.all([
                import("react-dom/client"),
                import("react"),
                import("./PdfViewer.jsx"),
                translations,
            ]);
        } catch (error) {
            // An old browser can fail to load the viewer code.
            log.error("Cannot load the PDF viewer.", error);
            await showFallback();
            return;
        }
        // destroy() can run while the modules and the catalog load.
        if (this.#destroyed) {
            return;
        }
        const [{ createRoot }, { createElement }, { default: PdfViewer }, t] = modules;
        // The React root replaces the fallback link.
        this.root = createRoot(this.el);
        this.root.render(createElement(PdfViewer, { file: url, t, ...options }));
    }

    destroy() {
        this.#destroyed = true;
        this.root?.unmount();
        super.destroy();
    }
}

// Register the pattern in the global pattern registry.
registry.register(Pattern);

export default Pattern;
export { Pattern };
