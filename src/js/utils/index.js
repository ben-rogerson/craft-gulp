/**
 * Utilities
 */

import debounce from "lodash/debounce";

const isDev = (process.env.NODE_ENV !== 'production');

export {
    debounce,
    isDev,
};
