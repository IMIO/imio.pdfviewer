import { useRef } from "react";
import Icon from "./Icon";

// The names of the tabs. The PDF tab comes first.
export const PDF_TAB = "pdf";
export const TEXT_TAB = "text";
const NAMES = [PDF_TAB, TEXT_TAB];

// The browser keeps the last tab of the reader under this name.
const STORAGE_KEY = "imio.pdfviewer.tab";

// The last tab of the reader, or null. A browser can refuse the storage.
export const readTab = () => {
    try {
        const name = window.localStorage.getItem(STORAGE_KEY);
        return NAMES.includes(name) ? name : null;
    } catch {
        return null;
    }
};

export const saveTab = (name) => {
    try {
        window.localStorage.setItem(STORAGE_KEY, name);
    } catch {
        // The viewer works without the storage.
    }
};

// The tab list. Only the selected tab is in the tab order of the page. The
// arrow keys, Home and End move the focus to a tab and select it.
const Tabs = ({ t, tabs, active, onChange }) => {
    const buttons = useRef({});

    const onKeyDown = (event) => {
        if (event.ctrlKey || event.metaKey || event.altKey || event.shiftKey) {
            return;
        }
        const index = tabs.findIndex((tab) => tab.name === active);
        const targets = {
            ArrowRight: (index + 1) % tabs.length,
            ArrowLeft: (index - 1 + tabs.length) % tabs.length,
            Home: 0,
            End: tabs.length - 1,
        };
        if (!(event.key in targets)) {
            return;
        }
        event.preventDefault();
        // The viewer has its own actions for the arrow keys.
        event.stopPropagation();
        const { name } = tabs[targets[event.key]];
        buttons.current[name]?.focus();
        onChange(name);
    };

    return (
        <div
            className="pdf-viewer-tabs"
            role="tablist"
            aria-label={t("Document views")}
            onKeyDown={onKeyDown}
        >
            {tabs.map((tab) => (
                <button
                    key={tab.name}
                    ref={(el) => {
                        buttons.current[tab.name] = el;
                    }}
                    type="button"
                    role="tab"
                    id={tab.id}
                    className="pdf-viewer-tab"
                    aria-selected={tab.name === active}
                    aria-controls={tab.panel}
                    tabIndex={tab.name === active ? 0 : -1}
                    onClick={() => onChange(tab.name)}
                >
                    <Icon name={tab.icon} />
                    {/* The CSS reads data-label to keep the width of the bold label. */}
                    <span className="pdf-viewer-tab-label" data-label={tab.label}>
                        {tab.label}
                    </span>
                </button>
            ))}
        </div>
    );
};

export default Tabs;
