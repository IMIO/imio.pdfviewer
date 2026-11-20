from Products.Five.browser import BrowserView

import json


class DemoView(BrowserView):
    """Show the PDF viewer for the PDF at the `url` parameter."""

    def options(self):
        """Return the `display` and `buttons` parameters as pattern options."""
        form = self.request.form
        return json.dumps({
            name: form[name] for name in ("display", "buttons") if name in form
        })
