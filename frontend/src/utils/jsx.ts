export interface ElementProps {
    [key: string]: any;
    children?: (Element | string | null | undefined)[];
}

export function createElement(
    tag: string | Function,
    props: ElementProps | null,
    ...children: (Element | string | null | undefined)[]
): Element {
    if (typeof tag === 'function') {
        return tag({ ...props, children });
    }

    const element = document.createElement(tag);

    if (props) {
        for (const [key, value] of Object.entries(props)) {
            if (key === 'children') continue;

            if (key.startsWith('on') && typeof value === 'function') {
                const eventName = key.slice(2).toLowerCase();
                element.addEventListener(eventName, value);
            } else if (key === 'className') {
                element.className = value;
            } else if (key === 'style' && typeof value === 'object') {
                Object.assign(element.style, value);
            } else {
                element.setAttribute(key, value);
            }
        }
    }

    for (const child of children.flat()) {
        if (child != null) {
            if (typeof child === 'string') {
                element.appendChild(document.createTextNode(child));
            } else {
                element.appendChild(child);
            }
        }
    }

    return element;
}

export function Fragment(props: { children: (Element | string)[] }): DocumentFragment {
    const fragment = document.createDocumentFragment();
    for (const child of props.children) {
        if (typeof child === 'string') {
            fragment.appendChild(document.createTextNode(child));
        } else {
            fragment.appendChild(child);
        }
    }
    return fragment;
}

declare global {
    namespace JSX {
        interface IntrinsicElements {
            [elemName: string]: any;
        }
    }
}
