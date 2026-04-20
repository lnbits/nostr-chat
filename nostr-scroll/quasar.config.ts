import { configure } from 'quasar/wrappers';

export default configure(() => {
  return {
    css: ['app.css'],
    extras: ['material-icons'],

    build: {
      target: {
        browser: ['es2022', 'firefox115', 'chrome115', 'safari14'],
        node: 'node24',
      },
      vueRouterMode: 'history',
    },

    devServer: {
      open: false,
    },

    framework: {
      config: {
        dark: true,
      },
      plugins: ['Notify'],
    },

    animations: [],
  };
});
