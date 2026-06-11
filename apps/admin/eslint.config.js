import reactConfig from '@adopt-dont-shop/eslint-config-react';

export default [
  ...reactConfig,
  {
    // ADS-585: native dialogs (window.confirm / alert) are banned in app.admin.
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
];
