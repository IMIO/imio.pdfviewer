import { BasePattern } from "@patternslib/patternslib/src/core/basepattern";
import Parser from "@patternslib/patternslib/src/core/parser";
import registry from "@patternslib/patternslib/src/core/registry";
import logging from "@patternslib/patternslib/src/core/logging";
import { readSiteSettings, resolveOptions } from "./settings";

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

        let modules;
        try {
            modules = await Promise.all([
                import("react-dom/client"),
                import("react"),
                import("./PdfViewer.jsx"),
            ]);
        } catch (error) {
            // An old browser cannot load the viewer. The child link stays.
            log.error("Cannot load the PDF viewer.", error);
            return;
        }
        const [{ createRoot }, { createElement }, { default: PdfViewer }] = modules;
        // The React root replaces the fallback link.
        this.root = createRoot(this.el);
        this.root.render(createElement(PdfViewer, { file: url, ...options }));
    }

    destroy() {
        this.root?.unmount();
        super.destroy();
    }
}

// Register the pattern in the global pattern registry.
registry.register(Pattern);

export default Pattern;
export { Pattern };
