import { BasePattern } from "@patternslib/patternslib/src/core/basepattern";
import Parser from "@patternslib/patternslib/src/core/parser";
import registry from "@patternslib/patternslib/src/core/registry";
import logging from "@patternslib/patternslib/src/core/logging";

const log = logging.getLogger("pdf-viewer");

export const parser = new Parser("pdf-viewer");
parser.addArgument("url", null);

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

        const [{ createRoot }, { createElement }, { default: PdfViewer }] =
            await Promise.all([
                import("react-dom/client"),
                import("react"),
                import("./PdfViewer.jsx"),
            ]);
        // The React root replaces the fallback link.
        this.root = createRoot(this.el);
        this.root.render(createElement(PdfViewer, { file: url }));
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
