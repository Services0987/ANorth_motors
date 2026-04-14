import os

def replace_api_url_in_file(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    old_str = 'const API = `${process.env.REACT_APP_BACKEND_URL}/api`;'
    new_str = 'const API = (process.env.REACT_APP_BACKEND_URL || "").replace(/\\/api\\/?$/, "") + "/api";'
    
    if old_str in content:
        content = content.replace(old_str, new_str)
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"Fixed {filepath}")

for root, _, files in os.walk('frontend/src'):
    for file in files:
        if file.endswith('.js'):
            replace_api_url_in_file(os.path.join(root, file))
