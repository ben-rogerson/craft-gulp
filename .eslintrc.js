module.exports = {
    extends: 'airbnb-base/legacy',
    rules: {
      'no-console': 'warn',
      'eol-last': 'off',
      'no-unused-vars': 'off',
      'no-console': 'off',
      'func-names': 'off',
      'one-var': 'off',
      'no-underscore-dangle': 'off',
      'no-throw-literal': 'off',
      'no-param-reassign': 'off',
      'consistent-return': 'off',
      'no-plusplus': 'off',
      'vars-on-top': 'off',
      'no-shadow': 'off',
      'no-undef': 'off',
      'no-shadow-restricted-names': 'off',
      'no-multiple-empty-lines': 'off',
      'semi': 'off',
      'no-new': 'off',
      'block-scoped-var': 'off',
      'class-methods-use-this': 'off',
      'no-bitwise': 'off',
      'comma-dangle': 'warn',
      'indent': ['warn', 4],
      'quotes': [
        'warn',
        'single',
        { 'allowTemplateLiterals': true }
      ]
    },
    env: {
      'browser': true,
      'es6': true,
      'node': true
    },
    parserOptions: {
      // ecmaVersion: 2017,
      parser: 'eslint-loader',
      sourceType: 'module',
    }
};
