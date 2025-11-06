const path = require("path");
const CopyPlugin = require("copy-webpack-plugin");
const HtmlWebpackPlugin = require("html-webpack-plugin");

module.exports = (env, argv) => ({
  entry: {
    popup: "./src/popup/index.ts",
    content: "./src/content/index.ts",
    background: "./src/background/index.ts",
  },
  output: {
    filename: "[name].js",
    path: path.resolve(__dirname, "dist"),
    clean: true,
  },
  // 避免使用 eval 类 SourceMap，满足 MV3 的 CSP 要求
  devtool: argv && argv.mode === "development" ? "inline-source-map" : false,
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: "ts-loader",
        exclude: /node_modules/,
      },
    ],
  },
  resolve: {
    extensions: [".tsx", ".ts", ".js"],
  },
  plugins: [
    new CopyPlugin({
      patterns: [
        { from: "public/manifest.json", to: "manifest.json" },
        { from: "public/icons", to: "icons" },
        { from: "public/logo", to: "logo" },
        { from: "public/toc.css", to: "toc.css" },
        { from: "src/styles/imageViewer.css", to: "imageViewer.css" },
        { from: "src/styles/linkifier.css", to: "linkifier.css" },
        { from: "public/images", to: "images", noErrorOnMissing: true },
      ],
    }),
    new HtmlWebpackPlugin({
      template: "src/popup/index.html",
      filename: "popup.html",
      chunks: ["popup"],
    }),
  ],
  optimization: {
    splitChunks: {
      chunks: "async",
    },
  },
});
