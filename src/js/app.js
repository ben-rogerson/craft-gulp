import './modules/icons';

// Examples

import sayGreeting from './modules/greeting';
import { isDev } from './utils';

sayGreeting();

console.log(`${ isDev ? `🚧` : `💼` } This app is running in ${ isDev ? `dev` : `production` } mode`);
