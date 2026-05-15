const fs = require("fs");

module.exports = function (api) {
    api.cache(true);
    const projectRoot = fs.realpathSync(__dirname);

    return {
        presets: [
            ["babel-preset-expo", { jsxImportSource: "nativewind" }]
        ],
        plugins: [
            ["module-resolver", {
                root: [projectRoot],
                alias: {
                    "@/context": `${projectRoot}/contexts`,
                    "@/contexts": `${projectRoot}/contexts`,
                    "@": projectRoot,
                },
                extensions: [".ios.js", ".android.js", ".js", ".jsx", ".ts", ".tsx", ".json"],
            }],
            "react-native-reanimated/plugin",
        ],
    };
};
