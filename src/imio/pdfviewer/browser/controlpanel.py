from imio.pdfviewer import _
from imio.pdfviewer.interfaces import IPdfViewerSettings
from plone.app.registry.browser.controlpanel import ControlPanelFormWrapper
from plone.app.registry.browser.controlpanel import RegistryEditForm
from plone.z3cform import layout
from z3c.form.browser.checkbox import CheckBoxFieldWidget


class PdfViewerSettingsForm(RegistryEditForm):
    """Edit the site settings of the PDF viewer."""

    schema = IPdfViewerSettings
    schema_prefix = "imio.pdfviewer"
    label = _("PDF viewer settings")

    def updateFields(self):
        super().updateFields()
        self.fields["buttons"].widgetFactory = CheckBoxFieldWidget


PdfViewerSettingsView = layout.wrap_form(PdfViewerSettingsForm, ControlPanelFormWrapper)
