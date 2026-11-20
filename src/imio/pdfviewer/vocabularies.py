from imio.pdfviewer import _
from zope.interface import provider
from zope.schema.interfaces import IVocabularyFactory
from zope.schema.vocabulary import SimpleTerm
from zope.schema.vocabulary import SimpleVocabulary


DISPLAY_MODES = {
    "continuous": _("Continuous scroll"),
    "single": _("Single page"),
}

# The optional buttons of the toolbar, in toolbar order.
# The JavaScript list BUTTONS in settings.js has the same names.
BUTTONS = {
    "download": _("Download"),
    "print": _("Print"),
    "rotate": _("Rotate"),
    "fit": _("Fit to width or page"),
    "zoom": _("Zoom"),
    "fullscreen": _("Full screen"),
}


def _vocabulary(titles):
    return SimpleVocabulary([
        SimpleTerm(value, title=title) for value, title in titles.items()
    ])


@provider(IVocabularyFactory)
def display_modes(context):
    """Display modes of the PDF viewer."""
    return _vocabulary(DISPLAY_MODES)


@provider(IVocabularyFactory)
def buttons(context):
    """Optional buttons of the PDF viewer toolbar."""
    return _vocabulary(BUTTONS)
