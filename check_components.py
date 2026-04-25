import os
import re

def check_file(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    # Find all used components <Component ...
    used_components = set(re.findall(r'<([A-Z][a-zA-Z0-9]*)', content))
    
    # Find all imports
    imports = set(re.findall(r'import\s+(?:\{[^}]*\}|([A-Z][a-zA-Z0-9]*))\s+from', content))
    named_imports = re.findall(r'\{([^}]*)\}', content)
    for ni in named_imports:
        for item in ni.split(','):
            item = item.strip().split(' as ')[-1].strip()
            if item:
                imports.add(item)
    
    # Find local definitions
    definitions = set(re.findall(r'(?:function|const|let|var)\s+([A-Z][a-zA-Z0-9]*)\s*[:=]', content))
    definitions.update(re.findall(r'function\s+([A-Z][a-zA-Z0-9]*)\s*\(', content))

    # Also check for React fragments etc.
    builtins = {'React', 'Fragment', 'Suspense', 'Profiler', 'StrictMode'}
    
    undefined = used_components - imports - definitions - builtins
    if undefined:
        print(f"File: {filepath}")
        print(f"  Undefined components: {undefined}")

def main():
    for root, dirs, files in os.walk('frontend/src'):
        for file in files:
            if file.endswith(('.js', '.jsx')):
                check_file(os.path.join(root, file))

if __name__ == '__main__':
    main()
