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
    clone.querySelectorAll('[name]').forEach(field => {
        const fieldName = field.getAttribute('name');
        const value = isXML ? item.querySelector(fieldName)?.textContent : item[fieldName];
        if (value) field.textContent = value;
    });
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
        const items = isXML ? data.querySelectorAll(el.getAttribute('key') || 'key') : data;

        items.forEach(item => {
            const populatedTemplate = populateTemplate(structure, item, isXML);
            el.appendChild(isXML ? populatedTemplate.firstElementChild : populatedTemplate);
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
        const manifestoResponse = await fetch('templates/manifesto.txt');
        if (!manifestoResponse.ok) {
            throw new Error(`Failed to load manifesto: ${manifestoResponse.status}`);
        }

        const manifestoText = await manifestoResponse.text();
        const templateFiles = manifestoText.split('\n').map(file => file.trim()).filter(file => file);

        for (const templateFile of templateFiles) {
            try {
                const templateResponse = await fetch(`templates/${templateFile}`);
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


