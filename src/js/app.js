import './modules/icons';
// import './modules/';


// Example: Import and call an exported function
import sayGreeting from './modules/example-module';
sayGreeting();

// Example: Import the environment variable 'isDev'
import { isDev } from './utils';
console.log(
    `${ isDev ? `🚧` : `💼` } This app is running in ${ isDev ? `dev` : `production` } mode`
);
