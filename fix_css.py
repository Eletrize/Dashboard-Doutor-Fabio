#!/usr/bin/env python3
"""
Corrige CSS desminificado corretamente
"""

import re

def fix_css(css_content):
    """Corrige pseudo-classes e pseudo-elementos"""
    
    # Corrigir : : para :: (pseudo-elementos)
    css_content = re.sub(r': :(:-webkit-[a-z-]+)', r':\1', css_content)
    css_content = re.sub(r': :([a-z-]+)', r'::\1', css_content)
    
    # Corrigir : before para :before
    css_content = re.sub(r': before', ':before', css_content)
    css_content = re.sub(r': after', ':after', css_content)
    
    # Corrigir : hover para :hover
    css_content = re.sub(r': hover', ':hover', css_content)
    css_content = re.sub(r': active', ':active', css_content)
    css_content = re.sub(r': focus', ':focus', css_content)
    css_content = re.sub(r': visited', ':visited', css_content)
    css_content = re.sub(r': link', ':link', css_content)
    css_content = re.sub(r': focus-visible', ':focus-visible', css_content)
    css_content = re.sub(r': first-child', ':first-child', css_content)
    css_content = re.sub(r': last-child', ':last-child', css_content)
    css_content = re.sub(r': nth-child', ':nth-child', css_content)
    css_content = re.sub(r': not', ':not', css_content)
    css_content = re.sub(r': checked', ':checked', css_content)
    css_content = re.sub(r': disabled', ':disabled', css_content)
    css_content = re.sub(r': enabled', ':enabled', css_content)
    
    # Corrigir : root para :root
    css_content = re.sub(r': root', ':root', css_content)
    
    # Corrigir : where para :where
    css_content = re.sub(r': where', ':where', css_content)
    
    return css_content

def main():
    """Função principal"""
    
    input_file = 'styles.css.backup'
    output_file = 'styles.css'
    
    print(f'Lendo arquivo original minificado: {input_file}')
    
    with open(input_file, 'r', encoding='utf-8') as f:
        content = f.read()
    
    print('Processando CSS...')
    
    # Primeiro, vamos fazer uma desminificação mais cuidadosa
    # Adicionar quebra de linha após }
    content = re.sub(r'\}', '}\n', content)
    
    # Adicionar quebra de linha e indentação após {
    content = re.sub(r'\{', ' {\n    ', content)
    
    # Adicionar quebra de linha após ; (dentro de regras)
    content = re.sub(r';(?![^{]*\})', ';\n    ', content)
    
    # Adicionar quebra de linha após , em seletores (fora de parênteses)
    # Mas manter vírgulas dentro de valores (como rgba, linear-gradient)
    lines = content.split('\n')
    result = []
    for line in lines:
        # Se a linha tem { significa que é um seletor
        if '{' in line and '(' not in line.split('{')[0]:
            # Apenas divide seletores, não valores
            selector_part = line.split('{')[0]
            rest = '{' + line.split('{', 1)[1] if '{' in line else ''
            selector_part = selector_part.replace(',', ',\n')
            line = selector_part + rest
        result.append(line)
    content = '\n'.join(result)
    
    # Corrigir indentação após }
    content = re.sub(r'\n    \}', '\n}', content)
    
    # Remover linhas vazias em excesso
    content = re.sub(r'\n\n\n+', '\n\n', content)
    
    # Corrigir pseudo-classes e pseudo-elementos
    content = fix_css(content)
    
    print(f'Salvando em: {output_file}')
    
    with open(output_file, 'w', encoding='utf-8') as f:
        f.write(content)
    
    print('✓ CSS corrigido com sucesso!')

if __name__ == '__main__':
    main()
