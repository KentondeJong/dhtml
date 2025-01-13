async function fetchAndParseData(url) {
    const response = await fetch(url);
    const contentType = response.headers.get('content-type');
    
    if (contentType.includes('application/json')) {
        return await response.json();
    } else if (contentType.includes('application/xml') || contentType.includes('text/xml')) {
        const text = await response.text();
        const parser = new DOMParser();
        return parser.parseFromString(text, 'application/xml');
    } 
    throw new Error('Unsupported content type');
}

function populateTemplate(template, item, isXML = false) {
    const clone = template.cloneNode(true);
    const regex = /{{(.*?)}}/g;
    
    const elementsToRemove = [];

    clone.innerHTML = clone.innerHTML.replace(regex, (match, p1) => {
        let value;
        if (isXML) {
            const path = p1.split('.');
            const selectorPath = path.join(' > ');
            value = item.querySelector(selectorPath);
            value = value ? value.textContent : null;
        } else {
            const parts = p1.split('.');
            value = item;
            for (let part of parts) {
                value = value[part];
                if (value === undefined) {
                    value = null;
                    break;
                }
            }
        }

        if (value === null) {
            const placeholder = document.createElement('span');
            placeholder.setAttribute('data-remove', 'true');
            elementsToRemove.push(placeholder);
            return placeholder.outerHTML;
        }

        return value;
    });

    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = clone.innerHTML;

    elementsToRemove.forEach(placeholder => {
        const element = tempDiv.querySelector('span[data-remove="true"]');
        if (element) {
            const parentLi = element.parentElement;
            if (parentLi) {
                parentLi.remove();
            } else {
                element.remove();
            }
        }
    });

    clone.innerHTML = tempDiv.innerHTML;
    return clone;
}

async function processForEachElement(el) {
    const url = el.getAttribute('src');
    if (!url) return;

    try {
        const data = await fetchAndParseData(url);
        const structure = el.cloneNode(true);
        el.innerHTML = '';

        const isXML = data instanceof Document;
        let items;
        if (isXML) {
            items = Array.from(data.documentElement.children);
        } else {
            items = Array.isArray(data) ? data : [data];
        }

        items.forEach(item => {
            const populatedTemplate = populateTemplate(structure, item, isXML);
            el.appendChild(populatedTemplate.firstElementChild);
        });
    } catch (error) {
        console.error(error.message);
    }
}

function processTemplateElements() {
    document.querySelectorAll('template').forEach(template => {
        const id = template.getAttribute('id');
        const nonRendered = document.querySelectorAll(`${id}:not([rendered])`);
        nonRendered.length > 0 && processTemplateElement(template)
    });
}

async function processTemplateElement(template, html = '') {
    const url = template.getAttribute('src');
    if (url && html == '') {
        try {
            const response = await fetch(url);
            const content = await response.text();
            processTemplateElement(template, content);
        } catch (error) {
            console.error(error.message);
        }
    } else {
        const content = html == '' ?  template.innerHTML : html;
        displayData(template, content);
    }
}

function displayData(template, content) {
    const id = template.getAttribute('id');
    if (!id) return;

    document.querySelectorAll(`${id}:not([rendered])`).forEach(el => {
        let modifiedContent = content;
        const attrs = [...el.attributes];
        
        attrs.forEach(attr => {
            modifiedContent = modifiedContent.replaceAll(`{{${attr.name}}}`, attr.nodeValue);
        });

        el.insertAdjacentHTML("beforeend", modifiedContent);

        el.setAttribute('rendered', true);
    
    });

    processTemplateElements();
}

// Main execution

async function loadTemplates() {
    try {
        const manifestoResponse = await fetch('manifesto.txt');
        if (!manifestoResponse.ok) {
            throw new Error(`Failed to load manifesto: ${manifestoResponse.status}`);
        }

        const manifestoText = await manifestoResponse.text();
        const templateFiles = manifestoText.split('\n').map(file => file.trim()).filter(file => file);

        for (const templateFile of templateFiles) {
            try {
                const templateResponse = await fetch(`${templateFile}`);
                if (!templateResponse.ok) {
                    throw new Error(`Failed to load template: ${templateFile} - ${templateResponse.status}`);
                }
                let content = await templateResponse.text();

                document.body.insertAdjacentHTML("beforeend",  content);

            } catch (error) {
                console.error(error);
            }
        }

        processTemplateElements();
        document.querySelectorAll('[foreach]').forEach(processForEachElement);

    } catch (error) {
        console.error('Error loading templates:', error);
    }
}

// Call the function to load templates
loadTemplates();


