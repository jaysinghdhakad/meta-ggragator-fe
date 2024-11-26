
const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');

module.exports = {
    entry: path.join(__dirname, 'src/index.js'),
    output: {
        path: path.join(__dirname, 'dist'),
        filename: 'bundle.js'
    },
    resolve: {
        extensions: ['.js', '.jsx'],
        fallback: { "crypto": require.resolve("crypto-browserify"), "vm": require.resolve("vm-browserify"), "stream": require.resolve("stream-browserify"), "http": require.resolve("stream-http"), "zlib": require.resolve("browserify-zlib"), "url": require.resolve("url/"), "https": require.resolve("https-browserify") }
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
            }
        ]
    },
    plugins: [
        new HtmlWebpackPlugin({ template: './public/index.html' })
    ],
    devServer: {
        hot: true,
        port: 3000,
        open: true
    }

}
