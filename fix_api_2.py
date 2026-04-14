import os
import re

def fix_api_logic(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # We want to catch the previous API logic and replace it with something foolproof
    # that ensures it ALWAYS ends in exactly ONE /api
    pattern = r'const API\s*=\s*\(process\.env\.REACT_APP_BACKEND_URL\s*\|\|\s*""\)\.replace\(/\\\\/api\\\\/\?\$\/,\s*""\)\s*\+\s*"/api";'
    new_str = 'const API = (process.env.REACT_APP_BACKEND_URL || "").replace(/(?:\\/api\\/?)+$/, "") + "/api";'
    
    if re.search(pattern, content) or 'const API =' in content:
        # Just manually replace the line starting with const API = ...
        lines = content.split('\n')
        for i, line in enumerate(lines):
            if line.strip().startswith('const API =') and 'REACT_APP_BACKEND_URL' in line:
                lines[i] = new_str
        
        new_content = '\n'.join(lines)
        if new_content != content:
            with open(filepath, 'w', encoding='utf-8') as f:
                f.write(new_content)
            print(f"Fixed {filepath}")

for root, _, files in os.walk('frontend/src'):
    for file in files:
        if file.endswith('.js'):
            fix_api_logic(os.path.join(root, file))
