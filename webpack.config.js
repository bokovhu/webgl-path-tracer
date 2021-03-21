const HtmlWebpackPlugin = require("html-webpack-plugin");
const path = require("path");

module.exports = {
    entry: "./source/index.ts",
    output: {
        path: path.resolve(__dirname, "dist"),
        filename: "pathtracer.bundle.js",
    },
    resolve: {
        extensions: [".ts", ".js", ".json"],
    },
    module: {
        rules: [
            {
                test: /\.(js|ts)x?$/,
                use: [
                    {
                        loader: "ts-loader",
                    },
                ],
            },
            {
                test: /\.glsl$/,
                type: "asset/source"
            },
            {
                test: /\.(png|jpg|bmp)$/,
                type: "asset/resource"
            }
        ],
    },
    plugins: [
        new HtmlWebpackPlugin({
            template: path.resolve(__dirname, "source/index.html"),
            inject: "body"
        })
    ],
};
