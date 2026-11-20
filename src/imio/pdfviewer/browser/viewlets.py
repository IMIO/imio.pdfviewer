from imio.pdfviewer.interfaces import IPdfViewerSettings
from plone.app.layout.viewlets.common import ViewletBase
from plone.registry.interfaces import IRegistry
from zope.component import getUtility

import json


class SettingsViewlet(ViewletBase):
    """Write the site settings of the PDF viewer as JSON in the page head.

    The pat-pdf-viewer pattern reads them. A missing record gives no value,
    so the pattern uses its own default.
    """

    def render(self):
        settings = getUtility(IRegistry).forInterface(
            IPdfViewerSettings, prefix="imio.pdfviewer", check=False
        )
        data = {
            name: getattr(settings, name)
            for name in ("display", "buttons")
            if getattr(settings, name) is not None
        }
        # A "<" in the JSON cannot close the script element.
        payload = json.dumps(data).replace("<", "\\u003c")
        return (
            '<script type="application/json" id="imio-pdfviewer-settings">'
            f"{payload}</script>"
        )
