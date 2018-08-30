/**
 * Inserts a hidden svg containing icons at the top of the body
 *
 * Usage:
 *
 * 1. Add the data-icons attribute to the body:
 * <body data-icons="assets/icons.svg">
 *
 * 2. In twig, display an icon within the svg like this:
 * {% import 'macros/utils' as utils %}
 * {{ utils.icon('iconFilename', 'iconClass') }}
 */

const bodyElement = document.querySelector('body');
const bodyAttribute = 'data-icons';
const iconsPath = bodyElement.getAttribute(bodyAttribute);
const prepend = (what, where) => where.insertBefore(what, where.firstChild);

const inlineFile = iconsPath => {
    if (!iconsPath) return;

    const request = new XMLHttpRequest();
    request.open('GET', iconsPath, true);

    request.onload = () => {
        if (request.status >= 200 && request.status < 400) {
            const svgIcon = request.responseXML.documentElement;
            svgIcon.setAttribute('display', 'none');
            svgIcon.setAttribute('aria-hidden', true);
            prepend(svgIcon, bodyElement);
            bodyElement.removeAttribute(bodyAttribute);
        }
    };

    request.send();
}

inlineFile(iconsPath);
