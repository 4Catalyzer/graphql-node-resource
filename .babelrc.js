module.exports = {
  presets: [
    [
      '@4c/4catalyzer',
      {
        target: 'node',
        modules: process.env.BABEL_ENV !== 'esm' ? 'commonjs' : false
      },
    ],
    '@babel/flow',
  ],
};
