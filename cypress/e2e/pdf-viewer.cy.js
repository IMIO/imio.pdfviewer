// End-to-end tests of pat-pdf-viewer on a Plone site.
// Start Plone first (`make start`). The site comes from `make create-site`.

// The zoom levels of zoom.js, in percent.
const LEVELS = [25, 33, 50, 67, 75, 90, 100, 110, 125, 150, 175, 200, 250, 300, 400];

const button = (label) => cy.get(`.pdf-viewer [aria-label="${label}"]`);
const pageCount = () => cy.get(".pdf-viewer-page-count [aria-hidden]");
const zoomLevel = () => cy.get(".pdf-viewer-zoom-level");
const viewport = () => cy.get(".pdf-viewer-viewport");
const firstPage = () => cy.get(".pdf-viewer-page").first();

// Width of the content box of the viewport: no padding, no scroll bar.
const contentWidth = (el) => {
    const style = getComputedStyle(el);
    return el.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight);
};

describe("pat-pdf-viewer", () => {
    it("shows a PDF of the site", () => {
        cy.visitViewer();
        cy.get(".pdf-viewer canvas").should("be.visible");
    });

    it("loads pdf.js from the site only", () => {
        // Record and stop each request to another host than the site.
        const site = new URL(Cypress.config("baseUrl")).host;
        const offsite = cy.spy().as("offsite");
        cy.intercept({ url: /.*/ }, (request) => {
            if (new URL(request.url).host !== site) {
                offsite(request.url);
                request.destroy();
            }
        });
        cy.intercept("**/++plone++imio.pdfviewer/bundles/pdf.worker.min.*.mjs").as("worker");
        cy.visitViewer();
        cy.wait("@worker");
        cy.get(".pdf-viewer canvas").should("be.visible");
        cy.get("@offsite").should("not.have.been.called");
    });

    it("renders the text of the pages", () => {
        cy.visitViewer();
        cy.get(".pdf-viewer .textLayer").first().should("contain.text", "page 1 of 3");
    });

    it("scrolls through all the pages in a box", () => {
        cy.visitViewer();
        cy.get(".pdf-viewer-page").should("have.length", 3);
        cy.get(".pdf-viewer").invoke("outerHeight").should("be.lessThan", 900);
        pageCount().should("have.text", "1 / 3");
        viewport().scrollTo("bottom");
        pageCount().should("have.text", "3 / 3");
        button("Previous page").click();
        pageCount().should("have.text", "2 / 3");
    });

    it("shows one page at a time in single mode", () => {
        cy.visitViewer({ display: "single" });
        cy.get(".pdf-viewer-page").should("have.length", 1);
        button("Next page").click();
        pageCount().should("have.text", "2 / 3");
        cy.get(".pdf-viewer .textLayer").should("contain.text", "page 2 of 3");
    });

    it("fits the page width by default", () => {
        cy.visitViewer();
        cy.get(".pdf-viewer canvas").should("be.visible");
        viewport().then(($viewport) => {
            firstPage().invoke("outerWidth").should("be.closeTo", contentWidth($viewport[0]), 2);
        });
    });

    it("zooms to the next level from the size on the screen", () => {
        cy.visitViewer();
        cy.get(".pdf-viewer canvas").should("be.visible");
        zoomLevel().then(($level) => {
            const fit = parseInt($level.text(), 10);
            const next = LEVELS.find((level) => level > fit + 1);
            button("Zoom in").click();
            zoomLevel().should("have.text", `${next}%`);
        });
    });

    it("switches between fit to width and fit to page", () => {
        cy.visitViewer();
        button("Fit to page").click();
        viewport().then(($viewport) => {
            firstPage().invoke("outerHeight").should("be.at.most", $viewport[0].clientHeight);
        });
        button("Fit to width").should("exist");
    });

    it("rotates the pages", () => {
        cy.visitViewer();
        button("Rotate").click();
        firstPage().should(($page) => {
            expect($page.outerHeight()).to.be.lessThan($page.outerWidth());
        });
    });

    it("zooms with the keyboard", () => {
        cy.visitViewer();
        cy.get(".pdf-viewer canvas").should("be.visible");
        zoomLevel()
            .invoke("text")
            .then((before) => {
                viewport().focus().type("+");
                zoomLevel().invoke("text").should("not.equal", before);
            });
    });

    it("labels the buttons and shows their icons", () => {
        cy.visitViewer();
        cy.get(".pdf-viewer-button").should("have.length.greaterThan", 5);
        cy.get(".pdf-viewer-button").each(($button) => {
            expect($button.attr("aria-label")).to.not.be.empty;
            cy.wrap($button).find(".pdf-viewer-icon svg").should("exist");
        });
    });

    it("shows only the buttons of the buttons option", () => {
        cy.visitViewer({ buttons: "zoom" });
        button("Zoom in").should("exist");
        button("Next page").should("exist");
        button("Download").should("not.exist");
        button("Print").should("not.exist");
        button("Rotate").should("not.exist");
    });

    it("shows the viewer in full screen", () => {
        cy.visitViewer();
        button("Full screen").click();
        cy.get(".pdf-viewer").should("have.class", "pdf-viewer-fullscreen");
        button("Exit full screen").click();
        cy.get(".pdf-viewer").should("not.have.class", "pdf-viewer-fullscreen");
    });

    it("zooms with a pinch", () => {
        cy.visitViewer();
        cy.get(".pdf-viewer canvas").should("be.visible");
        const fingers = (spread) => [
            { identifier: 1, clientX: 400 - spread, clientY: 400 },
            { identifier: 2, clientX: 400 + spread, clientY: 400 },
        ];
        zoomLevel()
            .invoke("text")
            .then((before) => {
                viewport()
                    .trigger("touchstart", { touches: fingers(50) })
                    .trigger("touchmove", { touches: fingers(100) })
                    .trigger("touchend", { touches: [], changedTouches: fingers(100) });
                zoomLevel().invoke("text").should("not.equal", before);
            });
    });

    it("fits the width again after a double tap", () => {
        cy.visitViewer();
        button("Zoom in").click();
        button("Fit to width").should("exist");
        // Send the two taps in one callback: a slow runner cannot put more
        // than the double tap delay between them. The taps are at the same place.
        viewport().then(($viewport) => {
            const el = $viewport[0];
            const { Event } = el.ownerDocument.defaultView;
            const finger = { identifier: 1, clientX: 300, clientY: 300 };
            const touch = (type, touches) => {
                const event = new Event(type, { bubbles: true, cancelable: true });
                Object.assign(event, { touches, changedTouches: [finger] });
                el.dispatchEvent(event);
            };
            touch("touchstart", [finger]);
            touch("touchend", []);
            touch("touchstart", [finger]);
            touch("touchend", []);
        });
        button("Fit to page").should("exist");
    });

    it("has French translations", () => {
        cy.request("/plonejsi18n?domain=imio.pdfviewer&language=fr")
            .its("body")
            .should((catalog) => {
                expect(catalog["Zoom in"]).to.equal("Zoomer");
                expect(catalog["Page ${page} of ${count}"]).to.equal(
                    "Page ${page} sur ${count}",
                );
            });
    });

    it("shows a download frame in a browser that cannot show the viewer", () => {
        const pdf = `${Cypress.config("baseUrl")}/sample.pdf/@@download/file`;
        cy.visit(`/@@pdfviewer-demo?${new URLSearchParams({ url: pdf })}`, {
            onBeforeLoad(win) {
                // The viewer needs structuredClone.
                delete win.structuredClone;
            },
        });
        cy.get(".pdf-viewer-fallback")
            .should("be.visible")
            .and("contain.text", "Your browser cannot show this document");
        cy.get(".pdf-viewer-fallback-download").should("have.attr", "href", pdf);
        cy.get(".pdf-viewer").should("not.exist");
    });

    describe("site settings", () => {
        const ALL_BUTTONS = ["download", "print", "rotate", "fit", "zoom", "fullscreen"];

        const saveSettings = ({ display, buttons }) => {
            cy.asAdmin();
            cy.visit("/@@pdfviewer-settings");
            cy.get("#form-widgets-display").select(display);
            cy.get('input[name="form.widgets.buttons:list"]').each(($box) => {
                cy.wrap($box)[buttons.includes($box.val()) ? "check" : "uncheck"]();
            });
            cy.get("#form-buttons-save").click();
            cy.contains("Changes saved");
        };

        afterEach(() => saveSettings({ display: "continuous", buttons: ALL_BUTTONS }));

        it("applies the site settings", () => {
            saveSettings({ display: "single", buttons: ["zoom"] });
            cy.visitViewer();
            cy.get("script#imio-pdfviewer-settings").should("exist");
            cy.get(".pdf-viewer-page").should("have.length", 1);
            button("Zoom in").should("exist");
            button("Download").should("not.exist");
        });

        it("lets the options of the element replace the site settings", () => {
            saveSettings({ display: "single", buttons: ["zoom"] });
            cy.visitViewer({ display: "continuous" });
            cy.get(".pdf-viewer-page").should("have.length", 3);
        });
    });
});
