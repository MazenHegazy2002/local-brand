import os
import re

def migrate_auth_imports():
    root_dir = "src"
    pattern = re.compile(r"import \{ authOptions \} from (['\"]).*auth/\[\.\.\.nextauth\]/route\1")
    replacement = "import { authOptions } from '@/lib/auth'"
    
    # Also handle dynamic imports like in events/route.ts
    dynamic_pattern = re.compile(r"await import\((['\"]).*auth/\[\.\.\.nextauth\]/route\1\)")
    dynamic_replacement = "await import('@/lib/auth')"

    for root, dirs, files in os.walk(root_dir):
        for file in files:
            if file.endswith((".ts", ".tsx")):
                file_path = os.path.join(root, file)
                with open(file_path, 'r', encoding='utf-8') as f:
                    content = f.read()
                
                new_content = pattern.sub(replacement, content)
                new_content = dynamic_pattern.sub(dynamic_replacement, new_content)
                
                if new_content != content:
                    with open(file_path, 'w', encoding='utf-8') as f:
                        f.write(new_content)
                    print(f"Migrated: {file_path}")

if __name__ == "__main__":
    migrate_auth_imports()
