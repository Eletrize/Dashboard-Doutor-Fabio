#!/usr/bin/env python3
"""
Desminificador de CSS
Converte CSS minificado em formato legível
"""

import re

def unminify_css(minified_css):
    """Desminifica CSS"""
    
    # Adicionar nova linha após chaves de abertura
    css = re.sub(r'\{', ' {\n    ', minified_css)
    
    # Adicionar nova linha antes de chaves de fechamento
    css = re.sub(r'\}', '\n}\n\n', css)
    
    # Adicionar nova linha após ponto-e-vírgula (propriedades CSS)
    css = re.sub(r';', ';\n    ', css)
    
    # Limpar espaços extras em seletores
    css = re.sub(r',([^\s])', r', \1', css)
    
    # Adicionar nova linha após vírgula em seletores
    css = re.sub(r',\s*', ',\n', css)
    
    # Corrigir media queries
    css = re.sub(r'@media\s+', '\n@media ', css)
    css = re.sub(r'@keyframes\s+', '\n@keyframes ', css)
    
    # Limpar múltiplas linhas vazias
    css = re.sub(r'\n\s*\n\s*\n', '\n\n', css)
    
    # Corrigir indentação após } que não deve ter indentação
    css = re.sub(r'\n    \}', '\n}', css)
    
    # Remover indentação desnecessária após }
    css = re.sub(r'\}\n    \n', '}\n\n', css)
    
    # Limpar espaços no início de linhas vazias
    css = re.sub(r'\n\s+\n', '\n\n', css)
    
    # Garantir espaço após dois-pontos
    css = re.sub(r':([^\s])', r': \1', css)
    
    return css.strip()

def main():
    """Função principal"""
    
    input_file = 'styles.css.backup'
    output_file = 'styles.css'
    
    print(f'Lendo arquivo: {input_file}')
    
    with open(input_file, 'r', encoding='utf-8') as f:
        minified_content = f.read()
    
    print('Desminificando CSS...')
    unminified_content = unminify_css(minified_content)
    
    print(f'Salvando em: {output_file}')
    
    with open(output_file, 'w', encoding='utf-8') as f:
        f.write(unminified_content)
    
    print('✓ CSS desminificado com sucesso!')
    print(f'  Tamanho original: {len(minified_content):,} bytes')
    print(f'  Tamanho novo: {len(unminified_content):,} bytes')

if __name__ == '__main__':
    main()
