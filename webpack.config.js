process.traceDeprecation = true;
const path = require("path");
const CopyPlugin = require("copy-webpack-plugin");
const mf_config = require("@patternslib/dev/webpack/webpack.mf");
const webpack_config = require("@patternslib/dev/webpack/webpack.config").config;
const package_json = require("./package.json");
const package_json_mockup = require("@plone/mockup/package.json");
const package_json_patternslib = require("@patternslib/patternslib/package.json");

// react-pdf and pdf.js stay in this bundle: pdf.js must have the version of
// the worker in this bundle. The other dependencies are shared with the
// other Module Federation bundles of the page.
const LOCAL_PACKAGES = ["react-pdf", "pdfjs-dist"];
const shared_dependencies = Object.fromEntries(
    Object.entries(package_json.dependencies).filter(
        ([name]) => !LOCAL_PACKAGES.includes(name),
    ),
);

// The iMio add-ons share one React with these entries, in addition to
// "react" and "react-dom". Each add-on has the same version of react and
// react-dom. The page takes the highest version of each entry, so react and
// react-dom/client always have the same version.
const shared_react = {
    "react-dom/client": {
        singleton: true,
        requiredVersion: package_json.dependencies["react-dom"],
    },
    "react/jsx-runtime": {
        singleton: true,
        requiredVersion: package_json.dependencies.react,
    },
};

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

    // pdf.js loads these files when a PDF needs them: the CMaps, the
    // standard fonts, the CMYK color profile and the image decoders (JBIG2,
    // CCITT, JPEG 2000). assets.js gives their URLs to pdf.js. quickjs runs
    // the scripts of a PDF. react-pdf does not run them, so the build does
    // not copy quickjs.
    const pdfjs_dir = path.dirname(require.resolve("pdfjs-dist/package.json"));
    config.plugins.push(
        new CopyPlugin({
            patterns: ["cmaps", "iccs", "standard_fonts", "wasm"].map((name) => ({
                from: path.join(pdfjs_dir, name),
                to: `pdfjs/${name}`,
                globOptions: { ignore: ["**/*quickjs*", "**/*QUICKJS*"] },
                // Copy the files as they are. Terser must not change them.
                info: { minimized: true },
            })),
        }),
    );

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
                ...shared_dependencies,
            },
            shared: shared_react,
        }),
    );

    if (process.env.NODE_ENV === "development") {
        config.devServer.port = "3001";
        config.devServer.static.directory = path.resolve(__dirname, "./resources/");
    }
    return config;
};
