const webpack = require('webpack');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const HTMLWebpackPluginConfig = new HtmlWebpackPlugin({
  template: __dirname + '/app/index.html',
  filename: 'index.html',
  inject: 'body',
});

const path = require('path');

const PATHS = {
  app: path.join(__dirname, 'app'),
  dist: path.join(__dirname, 'dist'),
};

module.exports = {
  entry: [
    './app/index.jsx',
  ],
  output: {
    path: PATHS.dist,
    filename: 'index_bundle.js',
  },
  module: {
    loaders: [
      {
        test: /\.worker\.js$/,
        include: PATHS.app,
        use: [
          { loader: 'worker-loader' },
          { loader: 'babel-loader' },
        ]
      },
      { 
        test: /\.(jsx|js)$/, 
        loader: 'babel-loader', 
        include: PATHS.app 
      },
      {
        test: /\.(ico)$/,
        loader: 'file-loader?name=/[name].[ext]',
        include: PATHS.app,
      },
      {
        test: /\.woff(2)?(\?v=[0-9]\.[0-9]\.[0-9])?$/,
        loader: 'url-loader?limit=10000&minetype=application/font-woff',
      },
      {
        test: /\.(ttf|eot|svg|jpg|png)(\?v=[0-9]\.[0-9]\.[0-9])?$/,
        loader: 'file-loader',
        options: {
          name: 'images/[name].[ext]',
        },
      },
      {
        test: /\.css$/,
        loader: 'style-loader!css-loader',
      }, 
    ],
  },
  plugins: [
    HTMLWebpackPluginConfig,
    new webpack.DefinePlugin({
      'process.env': {
        NODE_ENV: JSON.stringify(process.env.NODE_ENV),
      },
    }),
  ],
  resolve: {
    extensions: [
      '.js',
      '.jsx',
    ],
  },
  devtool: 'source-map',
  devServer: {
    stats: 'errors-only',
  },
};
