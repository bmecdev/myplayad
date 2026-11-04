#!/usr/bin/env python3
"""
Helper para actualizar SCREEN_ROTATE directamente en /boot/firmware/config.txt y /boot/firmware/cmdline.txt
Funciona 100% en particiones FAT32 sin usar 'sed -i' ni renombrado de archivos temporales.
"""
import sys
import os
import re

def update_rotation(target_value, custom_config=None):
    val = str(target_value).strip().lower()
    if val in ['0', 'landscape', 'horizontal', 'normal']:
        rot = '0'
    elif val in ['270', 'inverted']:
        rot = '270'
    elif val in ['180']:
        rot = '180'
    else:
        rot = '90'

    # 1. Actualizar config.txt
    candidates = [
        custom_config,
        sys.argv[2] if len(sys.argv) > 2 else None,
        os.environ.get('CONFIG_FILE'),
        '/boot/firmware/config.txt',
        '/boot/config.txt'
    ]
    target_file = None
    for c in candidates:
        if c and os.path.exists(c):
            target_file = c
            break

    success_cfg = False
    if target_file:
        try:
            with open(target_file, 'r', encoding='utf-8', errors='ignore') as f:
                content = f.read()

            pattern = re.compile(r'^[ \t]*#?[ \t]*SCREEN_ROTATE[ \t]*=.*$', re.MULTILINE)
            if pattern.search(content):
                new_content = pattern.sub(f'SCREEN_ROTATE={rot}', content)
            else:
                new_content = content.rstrip() + f'\n\n# Orientación MyPlayAd (0=Horizontal, 90=Vertical)\nSCREEN_ROTATE={rot}\n'

            with open(target_file, 'w', encoding='utf-8') as f:
                f.write(new_content)

            print(f"[OK] {target_file} actualizado a SCREEN_ROTATE={rot}")
            success_cfg = True
        except Exception as e:
            print(f"[ERROR] Falló la escritura en {target_file}: {e}", file=sys.stderr)
    else:
        print(f"[WARN] No se encontró config.txt en rutas estándar", file=sys.stderr)

    # 2. Actualizar cmdline.txt (KMS / Kernel fallback)
    cmdline_candidates = [
        '/boot/firmware/cmdline.txt',
        '/boot/cmdline.txt'
    ]
    cmdline_file = None
    for c in cmdline_candidates:
        if os.path.exists(c):
            cmdline_file = c
            break

    if cmdline_file:
        try:
            with open(cmdline_file, 'r', encoding='utf-8', errors='ignore') as f:
                cmd_content = f.read().strip()

            if 'rotate=' in cmd_content:
                new_cmd = re.sub(r'rotate=\d+', f'rotate={rot}', cmd_content)
            elif 'video=HDMI-A-1' in cmd_content:
                new_cmd = re.sub(r'video=HDMI-A-1:[^ ]*', f'video=HDMI-A-1:1920x1080@60,rotate={rot}', cmd_content)
            else:
                new_cmd = f"{cmd_content} video=HDMI-A-1:1920x1080@60,rotate={rot}"

            with open(cmdline_file, 'w', encoding='utf-8') as f:
                f.write(new_cmd + '\n')

            print(f"[OK] {cmdline_file} actualizado con rotate={rot}")
        except Exception as e:
            print(f"[WARN] No se pudo actualizar {cmdline_file}: {e}", file=sys.stderr)

    return success_cfg

if __name__ == '__main__':
    target = sys.argv[1] if len(sys.argv) > 1 else '90'
    custom = sys.argv[2] if len(sys.argv) > 2 else None
    ok = update_rotation(target, custom)
    sys.exit(0 if ok else (0 if not custom else 1))
