
const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const webpack = require('webpack');

module.exports = {
    entry: path.join(__dirname, 'src/index.js'),
    output: {
        path: path.join(__dirname, 'dist'),
        filename: 'bundle.js'
    },
    resolve: {
        extensions: ['.js', '.jsx'],
        fallback: { "crypto": require.resolve("crypto-browserify"), "vm": require.resolve("vm-browserify"), "stream": require.resolve("stream-browserify") ,  'process/browser': require.resolve('process/browser'),"path": require.resolve("path-browserify"), "os": require.resolve("os-browserify/browser")}
    },
    module: {
        rules: [
            {
                test: /\.js$|jsx/,
                exclude: /node_modules/,
                use: {
                    loader: 'babel-loader'
                }
            },
            {
                test: /\.css$/i,
                use: ["css-loader"],
            },
            {
                test: /\.(png|svg|jpg|jpeg|gif|ico)$/,
                exclude: /node_modules/,
                use: ['file-loader?name=[name].[ext]'] // ?name=[name].[ext] is only necessary to preserve the original file name
            }
        ]
    },
    plugins: [
        new HtmlWebpackPlugin({ template: './public/index.html' }), new webpack.ProvidePlugin({
            process: 'process/browser',
        })
    ],
    devServer: {
        hot: true,
        port: 3000,
        open: true
    }

}