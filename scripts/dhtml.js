document.querySelectorAll('template').forEach(el => {
    getData(el) 
    displayData(el);
});

async function getData(el) {
    const url = el.getAttribute('src');
    if (!url) return false

    try {
        const response = await fetch(url);
        const content = await response.text();
        const temp = document.createElement('div');
        temp.innerHTML = content;
        el.content.appendChild(temp);
        displayData(el);
    } catch (error) {
        console.error(error.message);
    }
}

function displayData(el) {
    const target = el.getAttribute('target');
    if (!target) return false

    const content = el.innerHTML;
    document.querySelectorAll(`${target}`).forEach(_el => {
        _el.insertAdjacentHTML("beforeend", content);
    });
}