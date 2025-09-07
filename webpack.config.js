const path = require('path');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const HtmlWebpackPlugin = require('html-webpack-plugin');

module.exports = {
  mode: process.env.NODE_ENV || 'development',
  devtool: 'source-map',
  
  entry: {
    popup: './src/popup/index.js',
    'service-worker': './src/background/service-worker.js',
    'content-script': './src/content/content-script.js'
  },
  
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: '[name].bundle.js',
    clean: true
  },
  
  module: {
    rules: [
      {
        test: /\.(js|jsx)$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: ['@babel/preset-env', '@babel/preset-react']
          }
        }
      },
      {
        test: /\.css$/,
        use: ['style-loader', 'css-loader']
      },
      {
        test: /\.(png|jpg|gif|svg)$/,
        type: 'asset/resource'
      }
    ]
  },
  
  resolve: {
    extensions: ['.js', '.jsx']
  },
  
  plugins: [
    new HtmlWebpackPlugin({
      template: './popup.html',
      filename: 'popup.html',
      chunks: ['popup']
    }),
    
    new CopyWebpackPlugin({
      patterns: [
        {
          from: 'manifest.json',
          to: 'manifest.json',
          transform(content) {
            const manifest = JSON.parse(content.toString());
            // Update paths for built files
            manifest.background.service_worker = 'service-worker.bundle.js';
            manifest.content_scripts[0].js = ['content-script.bundle.js'];
            manifest.action.default_popup = 'popup.html';
            return JSON.stringify(manifest, null, 2);
          }
        },
        {
          from: 'assets',
          to: 'assets',
          noErrorOnMissing: true
        },
        {
          from: 'src/styles',
          to: 'styles'
        },
        {
          from: 'public/collector-injected.js',
          to: 'collector-injected.js',
          noErrorOnMissing: false
        },
        {
          from: 'public/collector-injected-v2.js',
          to: 'collector-injected-v2.js',
          noErrorOnMissing: false
        },
        {
          from: 'public/collector-ultimate.js',
          to: 'collector-ultimate.js',
          noErrorOnMissing: false
        },
        {
          from: 'public/collector-final.js',
          to: 'collector-final.js',
          noErrorOnMissing: false
        }
      ]
    })
  ],
  
  optimization: {
    splitChunks: {
      chunks: 'async'
    }
  }
};
