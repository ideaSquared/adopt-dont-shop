import reactConfig from '@adopt-dont-shop/eslint-config-react';

export default [
  ...reactConfig,
  {
    // ADS-586: native dialogs (window.confirm / alert) are banned in app.rescue.
    // Use useConfirm + ConfirmDialog or toast from @adopt-dont-shop/lib.components.
    rules: {
      'no-restricted-globals': [
        'error',
        {
          name: 'alert',
          message: 'Use toast from @adopt-dont-shop/lib.components instead of alert().',
        },
        {
          name: 'confirm',
          message:
            'Use useConfirm + ConfirmDialog from @adopt-dont-shop/lib.components instead of confirm().',
        },
      ],
    },
  },
  {
    // ADS-1075: prefer the shared FormField + Input/SelectInput/TextArea + Zod
    // pattern over raw form elements and the deprecated TextInput. `warn`
    // (not `error`) since existing raw-input usage predates this rule and is
    // migrated incrementally by separate tickets — this only flags new debt.
    rules: {
      'react/forbid-elements': [
        'warn',
        {
          forbid: [
            {
              element: 'input',
              message:
                'Use Input from @adopt-dont-shop/lib.components (via FormField) instead of a raw <input> — see ADS-1075.',
            },
            {
              element: 'select',
              message:
                'Use SelectInput from @adopt-dont-shop/lib.components (via FormField) instead of a raw <select> — see ADS-1075.',
            },
            {
              element: 'textarea',
              message:
                'Use TextArea from @adopt-dont-shop/lib.components (via FormField) instead of a raw <textarea> — see ADS-1075.',
            },
          ],
        },
      ],
      'no-restricted-imports': [
        'warn',
        {
          paths: [
            {
              name: '@adopt-dont-shop/lib.components',
              importNames: ['TextInput'],
              message:
                'TextInput is deprecated — use Input (via FormField) instead — see ADS-1075.',
            },
          ],
        },
      ],
    },
  },
];
