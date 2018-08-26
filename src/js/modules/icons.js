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
 * {{ utils.icon('symbolId', 'iconClass(es)') }}
 */

const bodyElement = document.querySelector('body');
const bodyAttribute = 'data-icons';
const iconsPath = bodyElement.getAttribute(bodyAttribute);
const prepend = (what, where) => where.insertBefore(what, where.firstChild);

if (iconsPath) {
    const xhr = new XMLHttpRequest();
    xhr.open('GET', iconsPath);
    xhr.onload = () => {
        if (xhr.status === 200) {
            const svgIcon = xhr.responseXML.documentElement;
            svgIcon.style.display = 'none';
            prepend(svgIcon, bodyElement);
            bodyElement.removeAttribute(bodyAttribute);
        }
    };
}
