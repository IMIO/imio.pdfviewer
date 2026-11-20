import { useEffect, useState } from "react";
import { resolveIcon } from "./icons";

// A Plone icon. The SVG comes from the site, so it is safe to insert.
const Icon = ({ name }) => {
    const [svg, setSvg] = useState("");

    useEffect(() => {
        let active = true;
        resolveIcon(name).then((markup) => active && setSvg(markup));
        return () => {
            active = false;
        };
    }, [name]);

    return (
        <span
            className="pdf-viewer-icon"
            aria-hidden="true"
            dangerouslySetInnerHTML={{ __html: svg }}
        />
    );
};

export default Icon;
