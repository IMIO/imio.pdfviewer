from Products.Five.browser import BrowserView
from Products.Five.browser.pagetemplatefile import ViewPageTemplateFile

import json


# The sample PDF has this number of pages.
PAGES = 3


class DemoView(BrowserView):
    """Show the PDF viewer for the PDF at the `url` parameter.

    The `text` parameter adds a sample text version:

    - `inline`: the text is in the page;
    - `url`: the viewer gets the text from `@@pdfviewer-demo-text`;
    - `both`: the first page is in the page, the viewer gets the full text.
    """

    text_template = ViewPageTemplateFile("pdfviewer-demo-text.pt")

    def options(self):
        """Return the parameters of the request as pattern options."""
        form = self.request.form
        options = {name: form[name] for name in ("display", "buttons") if name in form}
        if form.get("text") in ("url", "both"):
            options["text-url"] = f"{self.context.absolute_url()}/@@pdfviewer-demo-text"
        return json.dumps(options)

    def inline_text(self):
        """Return the sample text to put in the page, or nothing."""
        pages = {"inline": PAGES, "both": 1}.get(self.request.form.get("text"))
        return self.text_template(pages=pages) if pages else ""


class DemoTextView(BrowserView):
    """Return the sample text version as an HTML fragment."""

    index = ViewPageTemplateFile("pdfviewer-demo-text.pt")

    def __call__(self):
        return self.index(pages=PAGES)
