import { boot } from 'quasar/wrappers';
import { installI18n } from 'src/i18n';

export default boot(({ app }) => {
  installI18n(app);
});
