// End-to-end test of the signature tags: draw zones on the pages, download
// the tagged PDF and read its tags with spike/check_tags.py (pdftotext, as
// imio.esign does). Start Plone first (`make start`).

// Width of the pages of sample.pdf, in points.
const PAGE_WIDTH = 595;
const DOWNLOAD = "cypress/downloads/sample-tagged.pdf";

const ZONES = [
    { id: "Signer1", page: 1, x: 100, y: 150, width: 200, height: 70 },
    { id: "Signer2", page: 2, x: 300, y: 500, width: 180, height: 60 },
];

const pageBox = (number) => cy.get(`.pdf-viewer-page[data-page-number="${number}"]`);

// Drag the pointer on a page, from the top-left to the bottom-right corner of the zone.
const drawZone = ({ page, x, y, width, height }) => {
    pageBox(page).scrollIntoView();
    pageBox(page)
        .find(".pdf-viewer-zones-drawing")
        .then(($layer) => {
            const rect = $layer[0].getBoundingClientRect();
            const scale = rect.width / PAGE_WIDTH;
            const at = (px, py) => ({
                clientX: rect.left + px * scale,
                clientY: rect.top + py * scale,
                pointerId: 1,
                pointerType: "mouse",
                isPrimary: true,
                button: 0,
                eventConstructor: "PointerEvent",
                scrollBehavior: false,
                force: true,
            });
            cy.wrap($layer)
                .trigger("pointerdown", at(x, y))
                .trigger("pointermove", at(x + width / 2, y + height / 2))
                .trigger("pointermove", at(x + width, y + height))
                .trigger("pointerup", at(x + width, y + height));
        });
};

describe("signature tags", () => {
    it("writes the tags of the drawn zones in the PDF", () => {
        cy.visitViewer({ tags: "1" });
        cy.get(".pdf-viewer canvas").should("be.visible");
        cy.contains("button", "Download the tagged PDF").should("be.disabled");
        cy.contains("button", "Draw a zone").click().should("have.attr", "aria-pressed", "true");

        for (const zone of ZONES) {
            cy.get(".pdf-viewer-tag-select").select(zone.id);
            drawZone(zone);
            cy.get(`.pdf-viewer-zone[data-tag-id="${zone.id}"]`).should(($zone) => {
                expect(Number($zone.attr("data-x"))).to.be.closeTo(zone.x, 1);
                expect(Number($zone.attr("data-y"))).to.be.closeTo(zone.y, 1);
                expect(Number($zone.attr("data-width"))).to.be.closeTo(zone.width, 1);
                expect(Number($zone.attr("data-height"))).to.be.closeTo(zone.height, 1);
            });
        }

        // The zones of the viewer, as the PDF must have them.
        const drawn = {};
        cy.get(".pdf-viewer-zone[data-tag-id]")
            .should("have.length", 2)
            .each(($zone) => {
                drawn[$zone.attr("data-tag-id")] = {
                    page: Number($zone.closest(".pdf-viewer-page").attr("data-page-number")),
                    x: Number($zone.attr("data-x")),
                    y: Number($zone.attr("data-y")),
                    width: $zone.attr("data-width"),
                    height: $zone.attr("data-height"),
                };
            });

        cy.contains("button", "Download the tagged PDF").click();
        cy.get(".pdf-viewer-tag-message").should("contain.text", "sample-tagged.pdf");
        cy.readFile(DOWNLOAD, "binary", { timeout: 20000 }).should("match", /^%PDF-/);

        cy.task("checkTags", DOWNLOAD, { timeout: 120000 }).then((tags) => {
            expect(tags).to.have.length(2);
            for (const tag of tags) {
                const zone = drawn[tag.id];
                expect(tag.valid, tag.tag).to.equal(true);
                expect(tag.page).to.equal(zone.page);
                expect(tag.x).to.be.closeTo(zone.x, 2);
                expect(tag.y).to.be.closeTo(zone.y, 2);
                expect(tag.width).to.equal(zone.width);
                expect(tag.height).to.equal(zone.height);
            }
        });
    });

    it("removes a zone", () => {
        cy.visitViewer({ tags: "1" });
        cy.contains("button", "Draw a zone").click();
        drawZone(ZONES[0]);
        cy.get(".pdf-viewer-zone[data-tag-id]").should("have.length", 1);
        cy.get('[aria-label="Remove the zone Signer1"]').click();
        cy.get(".pdf-viewer-zone[data-tag-id]").should("not.exist");
        cy.contains("button", "Download the tagged PDF").should("be.disabled");
    });

    it("stops drawing after a rotation", () => {
        cy.visitViewer({ tags: "1" });
        cy.get('.pdf-viewer [aria-label="Rotate"]').click();
        cy.contains("button", "Draw a zone").should("be.disabled");
        cy.get(".pdf-viewer-zones").should("not.exist");
        cy.get(".pdf-viewer-tag-message").should("contain.text", "without rotation");
    });

    it("shows no tag tools without the tags option", () => {
        cy.visitViewer();
        cy.get(".pdf-viewer canvas").should("be.visible");
        cy.get(".pdf-viewer-tag-toolbar").should("not.exist");
        cy.get(".pdf-viewer-zones").should("not.exist");
    });
});
