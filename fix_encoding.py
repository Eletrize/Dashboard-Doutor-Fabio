#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Script para corrigir encoding UTF-8 corrompido (mojibake) no script.js
Converte double-encoded UTF-8 para UTF-8 correto
"""

import re

def fix_utf8_encoding(text):
    """Corrige texto com double-encoding UTF-8"""
    
    # Mapeamento de caracteres corrompidos comuns
    replacements = {
        # Emojis
        'Ã°Å¸â€�Â�': '🎯',
        'Ã°Å¸â€œÅ ': '🔄',
        'Ã°Å¸â€œÂ±': '🔱',
        'Ã°Å¸Å'Â�': '🐛',
        'Ã°Å¸â€œÂ¡': '🔡',
        'Ã°Å¸Â�Â¥': '💥',
        'Ã°Å¸ÂÅ½': '📱',
        
        # Letras acentuadas
        'ÃƒÂ£o': 'ão',
        'ÃƒÂ§ÃƒÂ£o': 'ção',
        'ÃƒÂ§': 'ç',
        'ÃƒÂ­': 'í',
        'ÃƒÂ¡': 'á',
        'é': 'é',
        'ÃƒÂª': 'ê',
        'ÃƒÂ³': 'ó',
        'ÃƒÂº': 'ú',
        'ÃƒÂ': 'Ã',
        
        # Palavras compostas comuns
        'Função': 'Função',
        'detecção': 'detecção',
        'orientação': 'orientação',
        'localização': 'localização',
        'inicialização': 'inicialização',
        'solicitação': 'solicitação',
        'não': 'não',
        'são': 'são',
        'está': 'está',
        'página': 'página',
        'específicos': 'específicos',
        'será': 'será',
        'disponível': 'disponível',
        'idênticos': 'idênticos',
        'prioritária': 'prioritária',
        
        # Siglas e palavras em caps
        'PRODUÇÃO'O': 'PRODUÇÃO',
        'FORÇADO': 'FORÇADO',
    }
    
    # Aplicar substituições
    for wrong, right in replacements.items():
        text = text.replace(wrong, right)
    
    # Tentar decodificar double-encoding restante
    try:
        # Se ainda houver caracteres estranhos, tentar decodificar
        if any(char in text for char in ['Ã', 'Â', 'â€']):
            # Tentar converter latin1->utf8
            text_bytes = text.encode('latin1', errors='ignore')
            text = text_bytes.decode('utf-8', errors='ignore')
    except:
        pass
    
    return text

def main():
    input_file = 'script.js'
    output_file = 'script.js'
    
    print(f'Lendo {input_file}...')
    
    # Ler arquivo
    with open(input_file, 'r', encoding='utf-8', errors='ignore') as f:
        content = f.read()
    
    print('Corrigindo encoding...')
    
    # Corrigir encoding
    fixed_content = fix_utf8_encoding(content)
    
    # Salvar arquivo corrigido
    with open(output_file, 'w', encoding='utf-8') as f:
        f.write(fixed_content)
    
    print(f'✅ Arquivo salvo: {output_file}')
    print('Encoding UTF-8 corrigido!')

if __name__ == '__main__':
    main()
