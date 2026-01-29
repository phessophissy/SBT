/**
 * .eslintrc.cjs - ESLint Configuration
 * Enforce code quality standards for the SBT project
 */

module.exports = {
    env: {
        node: true,
        es2021: true,
        browser: true
    },
    extends: ['eslint:recommended'],
    parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module'
    },
    rules: {
        'indent': ['error', 4],
        'linebreak-style': ['error', 'unix'],
        'quotes': ['error', 'single', { avoidEscape: true }],
        'semi': ['error', 'always'],
        'no-console': ['warn', { allow: ['warn', 'error', 'log'] }],
        'no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
        'eqeqeq': ['error', 'always'],
        'curly': ['error', 'all'],
        'brace-style': ['error', '1tbs'],
        'comma-dangle': ['error', 'never'],
        'no-trailing-spaces': 'error',
        'no-multiple-empty-lines': ['error', { max: 2 }],
        'object-curly-spacing': ['error', 'always'],
        'array-bracket-spacing': ['error', 'never']
    },
    overrides: [
        {
            files: ['contracts/**/*.sol'],
            parser: 'solidity-parser-antlr',
            rules: {
                'no-console': 'off'
            }
        }
    ]
};
