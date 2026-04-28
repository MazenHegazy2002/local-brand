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
      if (file.endsWith('.ts') || file.endsWith('.tsx')) {
        results.push(file);
      }
    }
  });
  return results;
}

const files = walk('src');
const pattern = /import \{ authOptions \} from (['"]).*auth\/\[\.\.\.nextauth\]\/route\1/g;
const replacement = "import { authOptions } from '@/lib/auth'";
const dynamicPattern = /await import\((['"]).*auth\/\[\.\.\.nextauth\]\/route\1\)/g;
const dynamicReplacement = "await import('@/lib/auth')";

files.forEach(filePath => {
  const content = fs.readFileSync(filePath, 'utf8');
  let newContent = content.replace(pattern, replacement);
  newContent = newContent.replace(dynamicPattern, dynamicReplacement);
  
  if (newContent !== content) {
    fs.writeFileSync(filePath, newContent, 'utf8');
    console.log(`Migrated: ${filePath}`);
  }
});
