import Icon from "./Icon";

const Button = ({ label, icon, ...props }) => (
    <button
        type="button"
        className="pdf-viewer-button"
        aria-label={label}
        title={label}
        {...props}
    >
        <Icon name={icon} />
    </button>
);

// The toolbar. `buttons` gives the optional buttons to show.
const Toolbar = ({
    t,
    file,
    buttons,
    page,
    numPages,
    zoom,
    scale,
    canZoomIn,
    canZoomOut,
    isFullscreen,
    actions,
}) => {
    const show = (name) => buttons.includes(name);

    return (
        <div className="pdf-viewer-toolbar" role="toolbar" aria-label={t("Document toolbar")}>
            <div className="pdf-viewer-toolbar-group">
                {show("download") && (
                    <a
                        className="pdf-viewer-button"
                        href={file}
                        target="_blank"
                        rel="noopener"
                        aria-label={t("Download")}
                        title={t("Download")}
                    >
                        <Icon name="download" />
                    </a>
                )}
                {show("print") && (
                    <Button label={t("Print")} icon="printer" onClick={actions.print} />
                )}
            </div>

            <div className="pdf-viewer-toolbar-group">
                <Button
                    label={t("Previous page")}
                    icon="chevron-left"
                    onClick={actions.previous}
                    disabled={page <= 1}
                />
                <span className="pdf-viewer-page-count" aria-live="polite">
                    <span aria-hidden="true">
                        {page} / {numPages}
                    </span>
                    <span className="pdf-viewer-sr-only">
                        {t("Page ${page} of ${count}", { page, count: numPages })}
                    </span>
                </span>
                <Button
                    label={t("Next page")}
                    icon="chevron-right"
                    onClick={actions.next}
                    disabled={page >= numPages}
                />
            </div>

            <div className="pdf-viewer-toolbar-group">
                {show("rotate") && (
                    <Button label={t("Rotate")} icon="arrow-clockwise" onClick={actions.rotate} />
                )}
                {show("fit") &&
                    (zoom.mode === "page-width" ? (
                        <Button
                            label={t("Fit to page")}
                            icon="arrows-collapse-vertical"
                            onClick={actions.toggleFit}
                        />
                    ) : (
                        <Button
                            label={t("Fit to width")}
                            icon="arrows-expand-vertical"
                            onClick={actions.toggleFit}
                        />
                    ))}
                {show("zoom") && (
                    <>
                        <Button
                            label={t("Zoom out")}
                            icon="dash-lg"
                            onClick={actions.zoomOut}
                            disabled={!canZoomOut}
                        />
                        <span className="pdf-viewer-zoom-level">{Math.round(scale * 100)}%</span>
                        <Button
                            label={t("Zoom in")}
                            icon="plus-lg"
                            onClick={actions.zoomIn}
                            disabled={!canZoomIn}
                        />
                    </>
                )}
                {show("fullscreen") &&
                    (isFullscreen ? (
                        <Button
                            label={t("Exit full screen")}
                            icon="fullscreen-exit"
                            onClick={actions.toggleFullscreen}
                        />
                    ) : (
                        <Button
                            label={t("Full screen")}
                            icon="arrows-fullscreen"
                            onClick={actions.toggleFullscreen}
                        />
                    ))}
            </div>
        </div>
    );
};

export default Toolbar;
