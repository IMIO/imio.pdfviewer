import { TAG_IDS } from "./tags";

// The tools of the signature tags: the tag ID, the draw mode and the download.
// The Bootstrap classes give the look of the Plone buttons.
const TagToolbar = ({
    t,
    tagId,
    onTagId,
    drawing,
    canDraw,
    onToggleDrawing,
    zoneCount,
    busy,
    onDownload,
    message,
}) => (
    <div
        className="pdf-viewer-toolbar pdf-viewer-tag-toolbar"
        role="toolbar"
        aria-label={t("Signature tags")}
    >
        <div className="pdf-viewer-toolbar-group">
            <label className="pdf-viewer-tag-label">
                {t("Tag")}{" "}
                <select
                    className="pdf-viewer-tag-select form-select form-select-sm"
                    value={tagId}
                    onChange={(event) => onTagId(event.target.value)}
                >
                    {TAG_IDS.map((id) => (
                        <option key={id} value={id}>
                            {id}
                        </option>
                    ))}
                </select>
            </label>
            <button
                type="button"
                className={`pdf-viewer-tag-button btn btn-sm btn-outline-primary${drawing ? " active" : ""}`}
                aria-pressed={drawing}
                disabled={!canDraw}
                onClick={onToggleDrawing}
            >
                {t("Draw a zone")}
            </button>
            <button
                type="button"
                className="pdf-viewer-tag-button btn btn-sm btn-primary"
                disabled={!zoneCount || busy}
                onClick={onDownload}
            >
                {t("Download the tagged PDF")}
            </button>
        </div>
        <span className="pdf-viewer-tag-message" role="status">
            {message}
        </span>
    </div>
);

export default TagToolbar;
