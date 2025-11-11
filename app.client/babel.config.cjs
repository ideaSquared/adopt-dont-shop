module.exports = {
  presets: [
    ['@babel/preset-env', { targets: { node: 'current' } }],
    ['@babel/preset-react', { runtime: 'automatic' }],
    '@babel/preset-typescript',
  ],
  plugins: [
    [
      'babel-plugin-transform-vite-meta-env',
      {
        env: {
          VITE_API_BASE_URL: 'http://localhost:5000',
          NODE_ENV: 'test',
          MODE: 'test',
        },
      },
    ],
  ],
};
