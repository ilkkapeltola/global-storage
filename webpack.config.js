const path = require('path');

module.exports = [{
  entry: {
      'globalStorage': './src/client.ts',
    },
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
  output: {
    filename: '[name].js',
    path: path.resolve(__dirname, 'dist'),
    library: {
      name: 'globalStorage',
      type: 'umd'
    }
  },
  optimization: {
    minimize: false
  }
},
{
  entry: {
    'globalStorageHub': './src/hub.ts'
  },
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
  output: {
  filename: '[name].js',
  path: path.resolve(__dirname, 'dist'),
  library: {
    name: 'globalStorageHub',
    type: 'umd'
  }
  },
  optimization: {
  minimize: true
  }
}

];