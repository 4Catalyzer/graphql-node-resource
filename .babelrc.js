module.exports = {
  presets: [
    [
      '@4c/4catalyzer',
      {
        target: 'node',
        useBuiltIns: 'usage',
      },
    ],
    '@babel/flow',
  ],
};
