const patternslib_config = require("@patternslib/dev/eslint.config.js");

module.exports = [
    ...patternslib_config,
    {
        files: ["**/*.{js,jsx}"],
        languageOptions: {
            parserOptions: {
                ecmaFeatures: { jsx: true },
            },
        },
    },
];
