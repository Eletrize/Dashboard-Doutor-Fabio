#!/usr/bin/env python3
# -*- coding: utf-8 -*-

def fix_file():
    # Ler o arquivo em modo binário primeiro
    with open('script.js', 'rb') as f:
        content = f.read()
    
    # Tentar decodificar como UTF-8
    try:
        text = content.decode('utf-8')
    except:
        text = content.decode('latin-1')
    
    # Lista de substituições (em bytes para evitar problemas)
    replacements = [
        # Debug emoji
        (b'\xc3\x83\xc2\xb0\xc3\x85\xc2\xb8\xc3\xa2\xe2\x82\xac\xc5\x93\xc3\x82\xc2\xb', b'\xf0\x9f\x8e\xaf'),  # 🎯
        # Letras acentuadas simples
        (b'\xc3\x83\xc2\xa7\xc3\x83\xc2\xa3o', b'c\xc3\xa7\xc3\xa3o'),  # ção
        (b'\xc3\x83\xc2\xa3o', b'\xc3\xa3o'),  # ão
        (b'\xc3\x83\xc2\xa7', b'\xc3\xa7'),  # ç
        (b'\xc3\x83\xc2\xad', b'\xc3\xad'),  # í
        (b'\xc3\x83\xc2\xa1', b'\xc3\xa1'),  # á
        (b'\xc3\x83\xc2\xa9', b'\xc3\xa9'),  # é
        (b'\xc3\x83\xc2\xaa', b'\xc3\xaa'),  # ê
        (b'\xc3\x83\xc2\xb3', b'\xc3\xb3'),  # ó
        (b'\xc3\x83\xc2\xba', b'\xc3\xba'),  # ú
    ]
    
    # Converter texto de volta para bytes
    content_bytes = text.encode('utf-8', errors='ignore')
    
    # Aplicar substituições em bytes
    for old, new in replacements:
        content_bytes = content_bytes.replace(old, new)
    
    # Salvar arquivo corrigido
    with open('script.js', 'wb') as f:
        f.write(content_bytes)
    
    print("Encoding corrigido com sucesso!")

if __name__ == '__main__':
    fix_file()
