module.exports = {
    root: true,
    env: {
        browser: true,
        es2021: true,
        node: true,
    },
    ignorePatterns: ['node_modules', 'dist', 'coverage', 'build'],
    plugins: ['@typescript-eslint', 'import', 'no-only-tests', 'prettier', 'react', 'react-hooks', 'security'],
    extends: [
        'plugin:@typescript-eslint/recommended',
        'eslint:recommended',
        'plugin:react/recommended',
        'plugin:prettier/recommended',
        'plugin:security/recommended',
    ],
    overrides: [
        {
            files: ['*.json'],
            rules: {
                quotes: ['error', 'double'],
            },
        },
    ],
    parser: '@typescript-eslint/parser',
    parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
    },
    rules: {
        '@typescript-eslint/ban-types': 'off',
        '@typescript-eslint/no-array-constructor': 'off',
        '@typescript-eslint/no-empty-function': 'off',
        '@typescript-eslint/no-namespace': 'off',
        '@typescript-eslint/no-explicit-any': 'off',
        '@typescript-eslint/no-inferrable-types': 'off',
        '@typescript-eslint/explicit-module-boundary-types': 'off',
        '@typescript-eslint/no-non-null-assertion': 'off',
        '@typescript-eslint/no-empty-interface': 'off',
        '@typescript-eslint/explicit-function-return-type': 'off',
        '@typescript-eslint/ban-ts-comment': [
            'error',
            {
                'ts-ignore': false,
            },
        ],
        '@typescript-eslint/no-use-before-define': 'off',
        'no-unused-vars': 'off',
        '@typescript-eslint/no-unused-vars': [2, { args: 'none' }],
        'no-only-tests/no-only-tests': 'error',
        'no-prototype-builtins': 'off',
        'prettier/prettier': 'error',
        'react/prop-types': 'off',
        'react/display-name': 'off',
        'react/no-unescaped-entities': [
            'error',
            {
                forbid: [
                    {
                        char: '>',
                        alternatives: ['&gt;'],
                    },
                    {
                        char: '}',
                        alternatives: ['&#125;'],
                    },
                ],
            },
        ],
        'security/detect-object-injection': 'off',
        'import/no-duplicates': 'error',
    },
    settings: {
        react: {
            version: 'detect',
        },
    },
}
