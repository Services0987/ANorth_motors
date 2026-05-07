
import os

files = [
    r'c:\Users\HP2\Downloads\AutoNorth-main\repo_clone\src\pages\AdminInventory.js',
    r'c:\Users\HP2\Downloads\AutoNorth-main\repo_clone\backend\scraper.py',
    r'c:\Users\HP2\Downloads\AutoNorth-main\repo_clone\backend\server.py'
]

for file_path in files:
    if not os.path.exists(file_path):
        print(f"Skipping {file_path}")
        continue
        
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()

    fixed_content = content.replace('\\"', '"').replace("\\'", "'").replace("\\\\n", "\\n").replace("\\\\t", "\\t")

    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(fixed_content)
    print(f"Cleaned {file_path}")

print("Global cleanup complete.")
