// End-to-end tests of pat-pdf-viewer on a Plone site.
// Start Plone first (`make start`). The site comes from `make create-site`.

describe("pat-pdf-viewer", () => {
    it("shows a PDF of the site", () => {
        cy.visitViewer();
        cy.get(".pdf-viewer canvas").should("be.visible");
    });
});
