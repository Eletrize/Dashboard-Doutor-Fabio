#!/usr/bin/env python3
"""Remove hard-coded main ambiente pages that should be auto-generated"""

import re

# Read the file
with open('c:/Eletrize/novo modelo/Dashboard-Template/index.html', 'r', encoding='utf-8') as f:
    content = f.read()

# Main environment pages (without suffixes) - these MUST be generated from config.js
main_pages = ['ambiente1', 'ambiente2', 'ambiente3', 'ambiente4', 'ambiente5',
              'ambiente6', 'ambiente7', 'ambiente8', 'ambiente9']

removed_count = 0

for page in main_pages:
    # Pattern: match entire page definition including the trailing comma+newline
    # Format: ambiente1: () => `...`,
    pattern = r'^\s+' + re.escape(page) + r':\s*\(\)\s*=>\s*`.*?^\s+`,\s*?\n'
    
    matches = list(re.finditer(pattern, content, re.MULTILINE | re.DOTALL))
    
    if matches:
        # Remove the match
        content = re.sub(pattern, '', content, count=1, flags=re.MULTILINE | re.DOTALL)
        removed_count += 1
        print(f"✓ Removido: {page}")
    else:
        print(f"✗ Não encontrado: {page}")

# Write back
with open('c:/Eletrize/novo modelo/Dashboard-Template/index.html', 'w', encoding='utf-8') as f:
    f.write(content)

print(f"\n✅ Concluído! {removed_count} páginas principais removidas.")
print("Agora TODOS os ambientes serão gerados dinamicamente pelo config.js")
