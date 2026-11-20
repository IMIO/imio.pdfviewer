// Commands for the end-to-end tests of pat-pdf-viewer.

// The sample PDF that scripts/create_site.py adds to the site.
const PDF_URL = `${Cypress.config("baseUrl")}/sample.pdf/@@download/file`;

// Open the demo page of the viewer. The options become query parameters.
Cypress.Commands.add("visitViewer", (options = {}) => {
    const params = new URLSearchParams({ url: PDF_URL, ...options });
    cy.visit(`/@@pdfviewer-demo?${params}`);
    cy.get(".pdf-viewer").should("exist");
});
