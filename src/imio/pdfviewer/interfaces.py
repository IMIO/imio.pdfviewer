"""Module where all interfaces, events and exceptions live."""

from imio.pdfviewer import _
from imio.pdfviewer.vocabularies import BUTTONS
from zope import schema
from zope.interface import Interface
from zope.publisher.interfaces.browser import IDefaultBrowserLayer


class IImioPdfviewerLayer(IDefaultBrowserLayer):
    """Marker interface that defines a browser layer."""


class IPdfViewerSettings(Interface):
    """Site settings of the PDF viewer. The options of an element replace them."""

    display = schema.Choice(
        title=_("Display mode"),
        description=_("How the viewer shows the pages."),
        vocabulary="imio.pdfviewer.DisplayModes",
        default="continuous",
        required=True,
    )

    buttons = schema.List(
        title=_("Toolbar buttons"),
        description=_(
            "The buttons that the toolbar shows. The page buttons always show."
        ),
        value_type=schema.Choice(vocabulary="imio.pdfviewer.Buttons"),
        default=list(BUTTONS),
        required=False,
    )
