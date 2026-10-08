module.exports = (api) => {
    const config = require("@patternslib/dev/babel.config.js")(api);
    config.presets.push(["@babel/preset-react", { runtime: "automatic" }]);
    return config;
};
