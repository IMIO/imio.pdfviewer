const path = require("path");
const jest_config = require("@patternslib/dev/jest.config.js");

jest_config.rootDir = "./resources";
jest_config.roots = ["./"];
// babel-jest looks for the babel config in rootDir. The config is one level up.
jest_config.transform["^.+\\.[t|j]sx?$"] = [
    "babel-jest",
    { configFile: path.resolve(__dirname, "babel.config.js") },
];

module.exports = jest_config;
