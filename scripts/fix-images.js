const fs = require('fs');
const path = require('path');

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    file = path.join(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) {
      results = results.concat(walk(file));
    } else {
      if (file.endsWith('.tsx')) {
        results.push(file);
      }
    }
  });
  return results;
}

const files = walk('src');

files.forEach(filePath => {
  const content = fs.readFileSync(filePath, 'utf8');
  let newContent = content.replace(/layout="fill"/g, 'fill');
  newContent = newContent.replace(/objectFit="cover"/g, 'style={{ objectFit: "cover" }}');
  newContent = newContent.replace(/objectFit="contain"/g, 'style={{ objectFit: "contain" }}');
  
  if (newContent !== content) {
    fs.writeFileSync(filePath, newContent, 'utf8');
    console.log(`Updated: ${filePath}`);
  }
});
