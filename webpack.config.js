const path = require('path');
const webpack = require('webpack');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
// const MonacoEditorWebpackPlugin = require('monaco-editor-webpack-plugin');
const monacoFeatures = require('monaco-editor-webpack-plugin/features');

const mode = process.env.NODE_ENV || 'development';
const isProd = (mode === 'production');

module.exports = {
  mode,
  devtool: isProd ? 'source-map' : 'inline-source-map',
  entry: {
      app: './src/example.js',
  },
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: '[name].bundle.js',
    chunkFilename: '[name].chunk.js',
    globalObject: 'this',
  },
  plugins: [
    new HtmlWebpackPlugin(),
    new MiniCssExtractPlugin({
      filename: '[name].style.css',
      chunkFilename: '[id].chunk.css',
    }),
    // new MonacoEditorWebpackPlugin(),
  ],
  module: {
    rules: [{
      test: /\.js$/,
      exclude: /node_modules/,
      use: 'babel-loader',
    }, {
      test: /\.css$/,
      use: [
        MiniCssExtractPlugin.loader,
        'css-loader',
      ]
    }],
  }
};
