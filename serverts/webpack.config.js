const path = require('path');
const nodeExternals = require('webpack-node-externals');

module.exports = {
  externals: [nodeExternals()],
  mode: "development",
  devtool: "inline-source-map",
  entry: {
    main: "./src/main.ts",
  },
  output: {
    path: path.resolve(__dirname, 'build'),
    filename: "bundle.js"
  },
  target: "node",
  resolve: {
    extensions: [".ts", ".js", ".env"],
  },
  module: {
    rules: [
      {
        test: /\.ts$/,
        use: 'ts-loader',
        exclude: /node_modules/,
      },
    ],
  },
}
