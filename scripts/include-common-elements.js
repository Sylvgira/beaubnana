const fs = require('node:fs');
const path = require('node:path');
const {globSync} = require('glob');
const root = path.resolve(__dirname, '..');
for (const file of globSync('{*.html,products/*.html,policies/*.html}', {cwd:root})) {
    const depth = file.includes('/') ? '../' : '';
    let html = fs.readFileSync(path.join(root, file), 'utf8');
    for (const name of ['navbar','footer']) {
        const marker = name.toUpperCase();
        const source = fs.readFileSync(path.join(root,'includes',`${name}.html`),'utf8')
            .replaceAll('{{CURRENT_YEAR}}', String(new Date().getFullYear()))
            .replace(/href="\/(index.html|all-products.html|policies\/[^"?#]+)"/g, `href="${depth}$1"`);
        const section = new RegExp(`<!-- SHARED_${marker}_START -->[\\s\\S]*?<!-- SHARED_${marker}_END -->`);
        const replacement = `<!-- SHARED_${marker}_START -->${source}<!-- SHARED_${marker}_END -->`;
        html = html.replace(section, () => replacement);
        html = html.replace(name === 'navbar' ? '<div id="navbar-placeholder"></div>' : '<footer id="footer-placeholder"></footer>', () => replacement);
    }
    fs.writeFileSync(path.join(root,file),html);
}
