process.traceDeprecation = true;
const path = require("path");
const mf_config = require("@patternslib/dev/webpack/webpack.mf");
const webpack_config = require("@patternslib/dev/webpack/webpack.config").config;
const package_json = require("./package.json");
const package_json_mockup = require("@plone/mockup/package.json");
const package_json_patternslib = require("@patternslib/patternslib/package.json");

module.exports = () => {
    let config = {
        context: __dirname,
        entry: {
            "imio.pdfviewer.min": path.resolve(__dirname, "resources/index.js"),
        },
    };

    config = webpack_config({ config, package_json });
    config.output.path = path.resolve(
        __dirname,
        "src/imio/pdfviewer/browser/static/bundles",
    );

    // Compile JSX with babel and resolve .jsx imports.
    const babel_rule = config.module.rules.find((r) => r.loader === "babel-loader");
    babel_rule.test = /\.jsx?$/;
    config.resolve.extensions = [".js", ".jsx", ".json"];

    // Use the legacy build of pdf.js. It supports older browsers.
    config.resolve.alias = {
        ...config.resolve.alias,
        "pdfjs-dist$": "pdfjs-dist/legacy/build/pdf.mjs",
        "pdfjs-dist/web/pdf_viewer.mjs$": "pdfjs-dist/legacy/web/pdf_viewer.mjs",
    };

    // Webpack writes import.meta.url as the absolute path of the build
    // machine. This code runs only in Node.js. A fixed URL keeps the bundle
    // the same on all machines.
    config.module.rules.push({
        test: /pdfjs-dist[\\/]legacy[\\/]build[\\/]pdf\.mjs$/,
        loader: path.resolve(__dirname, "webpack/replace-loader.js"),
        options: {
            replacements: [
                {
                    search: /createRequire\(import\.meta\.url\)/g,
                    replace: 'createRequire("file:///pdfjs-dist/legacy/build/pdf.mjs")',
                },
            ],
        },
    });

    // Keep the source name in the file names of the worker and the spinner.
    config.output.assetModuleFilename = "[name].[contenthash][ext]";

    // pdf.js is large. Size hints give no useful information here.
    config.performance = { hints: false };

    config.plugins.push(
        mf_config({
            // Exposed as window.__patternslib_mf__imiopdfviewer
            name: "imio.pdfviewer",
            filename: "imio.pdfviewer-remote.min.js",
            // Relative to the webpack context. An absolute path changes the
            // module ids on each machine.
            remote_entry: "./resources/index.js",
            dependencies: {
                ...package_json_patternslib.dependencies,
                ...package_json_mockup.dependencies,
                ...package_json.dependencies,
            },
        }),
    );

    if (process.env.NODE_ENV === "development") {
        config.devServer.port = "3001";
        config.devServer.static.directory = path.resolve(__dirname, "./resources/");
    }
    return config;
};
