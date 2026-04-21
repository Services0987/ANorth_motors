import requests
from bs4 import BeautifulSoup
import re

url = "https://www.teamford.ca/used/inventory/results?region=Edmonton"
headers = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"}
resp = requests.get(url, headers=headers)
soup = BeautifulSoup(resp.text, 'html.parser')

slugs = []
for a in soup.find_all('a', href=True):
    href = a['href']
    if '/vehicles/' in href or '/used/vehicles/' in href:
        slugs.append(href)

print("Found vehicle links:", list(set(slugs))[:10])

matches = re.findall(r'\"([a-zA-Z0-9]+-dsn\.algolia\.net)\"', resp.text)
print("Algolia domains:", list(set(matches)))
