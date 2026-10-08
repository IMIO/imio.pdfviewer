// Replace fixed text in the source of a dependency.
// The build fails when the text is not found, for example after an upgrade.
module.exports = function (source) {
    const { replacements } = this.getOptions();
    for (const { search, replace } of replacements) {
        if (!search.test(source)) {
            this.emitError(
                new Error(
                    `${search} is not found in ${this.resourcePath}. Examine the ` +
                        "new version of this dependency and update webpack.config.js.",
                ),
            );
            continue;
        }
        source = source.replace(search, replace);
    }
    return source;
};
