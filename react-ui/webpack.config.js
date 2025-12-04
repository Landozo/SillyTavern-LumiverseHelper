const path = require('path');
const TerserPlugin = require('terser-webpack-plugin');

module.exports = (env, argv) => {
    const isDev = argv.mode === 'development';

    // Check if we should bundle React or use external
    // SillyTavern doesn't provide React globally, so we need to bundle it
    // But we need to ensure only one React instance exists
    const useExternalReact = false;

    return {
        entry: path.join(__dirname, 'src/index.jsx'),
        output: {
            path: path.join(__dirname, '../dist'),
            filename: 'ui.bundle.js',
            // Expose module as a global variable on window
            library: {
                name: 'LumiverseUI',
                type: 'window',
                export: 'default',
            },
        },
        resolve: {
            extensions: ['.js', '.jsx'],
        },
        module: {
            rules: [
                {
                    test: /\.(js|jsx)$/,
                    exclude: /node_modules/,
                    use: {
                        loader: 'babel-loader',
                        options: {
                            cacheDirectory: true,
                            presets: [
                                '@babel/preset-env',
                                ['@babel/preset-react', { runtime: 'automatic' }],
                            ],
                        },
                    },
                },
                {
                    test: /\.css$/,
                    use: ['style-loader', 'css-loader'],
                },
            ],
        },
        optimization: {
            minimize: !isDev,
            minimizer: [
                new TerserPlugin({
                    extractComments: false,
                    terserOptions: {
                        format: {
                            comments: false,
                        },
                    },
                }),
            ],
        },
        devtool: isDev ? 'eval-source-map' : false,
        watchOptions: {
            ignored: /node_modules/,
        },
    };
};
