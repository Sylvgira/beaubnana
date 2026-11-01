const fs = require('node:fs');
const path = require('node:path');
const {globSync} = require('glob');
const root = path.resolve(__dirname, '..');
const base = process.env.SITE_URL || 'https://sylvgira.github.io/beaubnana/';
for (const file of globSync('{*.html,products/*.html,policies/*.html}', {cwd:root})) {
    if (file.endsWith('template.html')) continue;
    const target = path.join(root, file);
    let html = fs.readFileSync(target, 'utf8').replace(/<html(?![^>]*\blang=)/, '<html lang="en"');
    html = html.replace(/<link rel="canonical"[^>]*>\s*/g, '');
    html = html.replace('</head>', `<link rel="canonical" href="${new URL(file, base)}">\n</head>`);
    if (file.startsWith('products/')) {
        const image = html.match(/<img\s+src="(https:[^"]+)"/);
        if (image) html = html.replace(/(<meta[^>]*property="og:image"[^>]*content=")[^"]*"/, `$1${image[1]}"`);
    }
    html = html.replace(/\bAUD (\d+(?:\.\d{1,2})?)\b/g, (_,amount) => 'AUD ' + Number(amount).toFixed(2));
    html = html.replace(/(href="(?:\.\.\/)?products\/[^"?#.]+)"/g, '$1.html"');
    fs.writeFileSync(target, html);
}
const out = path.join(root, 'dist');
fs.rmSync(out, {recursive:true, force:true});
fs.mkdirSync(out);
for (const file of globSync('{*.html,robots.txt,images/**,css/**,js/**,products/*.html,policies/*.html}', {cwd:root, nodir:true})) {
    if (file.endsWith('template.html')) continue;
    const destination = path.join(out, file);
    fs.mkdirSync(path.dirname(destination), {recursive:true});
    fs.copyFileSync(path.join(root, file), destination);
}
fs.writeFileSync(path.join(out, '.nojekyll'), '');
