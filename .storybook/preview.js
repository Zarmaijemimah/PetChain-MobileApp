/** @type { import('@storybook/react-native').Preview } */
const preview = {
  parameters: {
    backgrounds: {
      default: 'light',
      values: [
        { name: 'light', value: '#ffffff' },
        { name: 'gray', value: '#f5f5f5' },
        { name: 'dark', value: '#1a1a1a' },
      ],
    },
  },
  decorators: [],
};

export default preview;
