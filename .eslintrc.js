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
    quotes: [
      'warn',
      'single',
      { 'allowTemplateLiterals': true }
    ]
  },
  env: {
    browser: true,
    jquery: true
  },
  parserOptions: {
    ecmaVersion: 2017,
    sourceType: 'module',
  }
};
