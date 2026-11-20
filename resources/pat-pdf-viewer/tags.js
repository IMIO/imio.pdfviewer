// Signature tags of imio.esign. A tag is a text in the page content, like
// {{#"ID":"Signer1","Size":{"Height":"70","Width":"200"}#}}. The signing
// service finds the tag and puts the signature image at its place.
//
// A zone is { id, page, x, y, width, height }: the tag ID, the page number and
// a box in PDF points from the top-left corner of the page, at scale 1.

export const TAG_IDS = ["Signer1", "Signer2", "Signer3", "Signer4", "SCEAU"];

// The largest font size of a tag, in points.
const MAX_FONT_SIZE = 5;

export class SignedPdfError extends Error {}

// The tag text of a zone. Height and Width are whole points.
export const tagText = ({ id, width, height }) =>
    `{{#"ID":"${id}","Size":{"Height":"${Math.round(height)}","Width":"${Math.round(width)}"}#}}`;

// Bit 1 of the AcroForm SigFlags: the document has a signature.
const isSigned = (doc, { PDFDict, PDFName, PDFNumber }) => {
    const form = doc.catalog.lookupMaybe(PDFName.of("AcroForm"), PDFDict);
    const flags = form?.lookupMaybe(PDFName.of("SigFlags"), PDFNumber)?.asNumber() ?? 0;
    return (flags & 1) === 1;
};

// Write the tag of each zone in the PDF. Return the bytes of the new PDF.
export const addTags = async (bytes, zones) => {
    const lib = await import("@cantoo/pdf-lib");
    const { PDFDocument, StandardFonts, rgb } = lib;
    // An incremental update keeps the original bytes at the start of the file.
    const doc = await PDFDocument.load(bytes, {
        forIncrementalUpdate: true,
        updateMetadata: false,
    });
    if (isSigned(doc, lib)) {
        throw new SignedPdfError("The PDF has a signature.");
    }
    const font = await doc.embedFont(StandardFonts.Helvetica);
    for (const zone of zones) {
        const page = doc.getPage(zone.page - 1);
        const crop = page.getCropBox();
        const text = tagText(zone);
        // pdftotext ignores the characters outside the page. The text must
        // not be wider than the zone.
        const size = Math.min(MAX_FONT_SIZE, zone.width / font.widthOfTextAtSize(text, 1));
        page.drawText(text, {
            x: crop.x + zone.x,
            // PDF y goes up from the bottom. The top of the glyphs is at the top of the zone.
            y: crop.y + crop.height - zone.y - font.heightAtSize(size, { descender: false }),
            size,
            font,
            color: rgb(1, 1, 1),
        });
    }
    return doc.commit();
};

// The file name of the server, or the last ".pdf" part of the URL.
const fileName = (response, url) => {
    const disposition = response.headers.get("Content-Disposition") || "";
    const match = disposition.match(/filename\*=UTF-8''([^;]+)|filename="?([^";]+)"?/i);
    if (match) {
        return decodeURIComponent(match[1] || match[2]);
    }
    const parts = new URL(url, window.location.href).pathname.split("/");
    return parts.findLast((part) => /\.pdf$/i.test(part)) || "document.pdf";
};

// Download the PDF, add the tags and give the result to the user as a file.
export const downloadTaggedPdf = async (url, zones) => {
    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`Cannot download the PDF: HTTP ${response.status}.`);
    }
    const bytes = await addTags(await response.arrayBuffer(), zones);
    const name = `${fileName(response, url).replace(/\.pdf$/i, "")}-tagged.pdf`;
    const href = URL.createObjectURL(new Blob([bytes], { type: "application/pdf" }));
    const link = document.createElement("a");
    link.href = href;
    link.download = name;
    document.body.append(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(href), 10000);
    return name;
};
