import type { Configuration } from 'webpack';

export const mainConfig: Configuration = {
  entry: './src/main.ts',
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: 'ts-loader',
        exclude: /node_modules/,
      },
    ],
  },
  resolve: {
    extensions: ['.tsx', '.ts', '.js'],
  },
  target: 'electron-main',
  output: {
    path: __dirname + '/dist',
    filename: 'main.js',
  },
  node: {
    __dirname: false,
    __filename: false,
  },
  externals: {
    'better-sqlite3': 'commonjs better-sqlite3',
  },
};