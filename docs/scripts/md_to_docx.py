import os
import re
import sys
from docx import Document
from docx.shared import Inches, Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT, WD_ALIGN_VERTICAL
from docx.oxml import OxmlElement, parse_xml
from docx.oxml.ns import nsdecls, qn

def set_cell_background(cell, hex_color):
    tcPr = cell._tc.get_or_add_tcPr()
    shd = parse_xml(f'<w:shd {nsdecls("w")} w:fill="{hex_color}"/>')
    tcPr.append(shd)

def set_cell_margins(cell, top=100, bottom=100, left=150, right=150):
    tcPr = cell._tc.get_or_add_tcPr()
    tcMar = parse_xml(f'<w:tcMar {nsdecls("w")}><w:top w:w="{top}" w:type="dxa"/><w:bottom w:w="{bottom}" w:type="dxa"/><w:left w:w="{left}" w:type="dxa"/><w:right w:w="{right}" w:type="dxa"/></w:tcMar>')
    tcPr.append(tcMar)

def add_code_block(doc, code_text):
    table = doc.add_table(rows=1, cols=1)
    table.alignment = WD_TABLE_ALIGNMENT.CENTER
    cell = table.cell(0, 0)
    set_cell_background(cell, "F1F5F9")
    set_cell_margins(cell, top=140, bottom=140, left=200, right=200)
    
    # Border
    tcPr = cell._tc.get_or_add_tcPr()
    tcBorders = parse_xml(f'<w:tcBorders {nsdecls("w")}><w:top w:val="single" w:sz="4" w:space="0" w:color="CBD5E1"/><w:left w:val="single" w:sz="18" w:space="0" w:color="0284C7"/><w:bottom w:val="single" w:sz="4" w:space="0" w:color="CBD5E1"/><w:right w:val="single" w:sz="4" w:space="0" w:color="CBD5E1"/></w:tcBorders>')
    tcPr.append(tcBorders)
    
    p = cell.paragraphs[0]
    p.paragraph_format.space_before = Pt(2)
    p.paragraph_format.space_after = Pt(2)
    p.paragraph_format.line_spacing = 1.05
    run = p.add_run(code_text.strip())
    run.font.name = "Consolas"
    run.font.size = Pt(8.5)
    run.font.color.rgb = RGBColor(0x0F, 0x17, 0x2A)
    
    # Spacer
    sp = doc.add_paragraph()
    sp.paragraph_format.space_before = Pt(0)
    sp.paragraph_format.space_after = Pt(4)

def parse_inline_formatting(paragraph, text, base_font="Calibri", base_size=10.5, text_color=(0x1E, 0x29, 0x3B)):
    # Simple regex parser for **bold**, *italic*, `code`, and clean HTML entities
    text = text.replace("&quot;", '"').replace("&amp;", '&').replace("&lt;", '<').replace("&gt;", '>')
    
    # Tokens: pattern splits by **...**, *...*, `...`
    pattern = r'(\*\*[^*]+?\*\*|\*[^*]+?\*|`[^`]+?`)'
    parts = re.split(pattern, text)
    
    for part in parts:
        if not part:
            continue
        run = paragraph.add_run()
        run.font.name = base_font
        run.font.size = Pt(base_size)
        run.font.color.rgb = RGBColor(*text_color)
        
        if part.startswith("**") and part.endswith("**"):
            run.text = part[2:-2]
            run.bold = True
        elif part.startswith("*") and part.endswith("*") and len(part) > 2:
            run.text = part[1:-1]
            run.italic = True
        elif part.startswith("`") and part.endswith("`"):
            run.text = part[1:-1]
            run.font.name = "Consolas"
            run.font.size = Pt(base_size - 1)
            run.font.color.rgb = RGBColor(0x02, 0x84, 0xC7) # Teal/Cyan
        else:
            run.text = part

def convert_markdown_to_docx(md_path, docx_path, img_base_dir):
    doc = Document()
    
    # Page setup: Normal Margins (1 inch)
    for section in doc.sections:
        section.top_margin = Inches(1)
        section.bottom_margin = Inches(1)
        section.left_margin = Inches(1)
        section.right_margin = Inches(1)
        
        # Header
        header = section.header
        hp = header.paragraphs[0]
        hp.alignment = WD_ALIGN_PARAGRAPH.RIGHT
        hrun = hp.add_run("MyPlayAd · Documentación Técnica y Comercial BMEC")
        hrun.font.name = "Calibri"
        hrun.font.size = Pt(8.5)
        hrun.font.color.rgb = RGBColor(0x94, 0xA3, 0xB8)
        
        # Footer
        footer = section.footer
        fp = footer.paragraphs[0]
        fp.alignment = WD_ALIGN_PARAGRAPH.CENTER
        frun = fp.add_run("Botero Mechatronics SAS (BMEC) · Confidencial")
        frun.font.name = "Calibri"
        frun.font.size = Pt(8.5)
        frun.font.color.rgb = RGBColor(0x94, 0xA3, 0xB8)

    with open(md_path, "r", encoding="utf-8") as f:
        lines = f.readlines()

    in_code_block = False
    code_block_lines = []
    in_table = False
    table_lines = []

    def flush_table():
        nonlocal in_table, table_lines
        if not table_lines:
            in_table = False
            return
        
        rows_data = []
        for line in table_lines:
            line_str = line.strip()
            if not line_str.startswith("|"):
                continue
            cols = [c.strip() for c in line_str.split("|")[1:-1]]
            # Skip separator line like | :--- | :--- |
            if cols and all(re.match(r"^:?-+:?$", c) for c in cols):
                continue
            rows_data.append(cols)
            
        if rows_data:
            num_rows = len(rows_data)
            num_cols = max(len(r) for r in rows_data)
            table = doc.add_table(rows=num_rows, cols=num_cols)
            table.alignment = WD_TABLE_ALIGNMENT.CENTER
            
            for row_idx, r_data in enumerate(rows_data):
                row = table.rows[row_idx]
                is_header = (row_idx == 0)
                for col_idx in range(num_cols):
                    cell = row.cells[col_idx]
                    cell_text = r_data[col_idx] if col_idx < len(r_data) else ""
                    
                    if is_header:
                        set_cell_background(cell, "0E7490") # Dark Teal
                        set_cell_margins(cell, top=140, bottom=140, left=140, right=140)
                        p = cell.paragraphs[0]
                        p.alignment = WD_ALIGN_PARAGRAPH.CENTER
                        p.paragraph_format.space_before = Pt(3)
                        p.paragraph_format.space_after = Pt(3)
                        run = p.add_run(cell_text)
                        run.font.name = "Calibri"
                        run.font.size = Pt(9.5)
                        run.bold = True
                        run.font.color.rgb = RGBColor(0xFF, 0xFF, 0xFF)
                    else:
                        bg_hex = "F8FAFC" if row_idx % 2 == 1 else "FFFFFF"
                        set_cell_background(cell, bg_hex)
                        set_cell_margins(cell, top=100, bottom=100, left=120, right=120)
                        p = cell.paragraphs[0]
                        p.paragraph_format.space_before = Pt(2)
                        p.paragraph_format.space_after = Pt(2)
                        parse_inline_formatting(p, cell_text, base_font="Calibri", base_size=9)
            
            # Spacer after table
            sp = doc.add_paragraph()
            sp.paragraph_format.space_before = Pt(0)
            sp.paragraph_format.space_after = Pt(6)
            
        table_lines = []
        in_table = False

    i = 0
    while i < len(lines):
        line = lines[i]
        stripped = line.strip()

        # Handle Code Block toggle
        if stripped.startswith("```"):
            if in_table:
                flush_table()
            if in_code_block:
                add_code_block(doc, "".join(code_block_lines))
                code_block_lines = []
                in_code_block = False
            else:
                in_code_block = True
            i += 1
            continue

        if in_code_block:
            code_block_lines.append(line)
            i += 1
            continue

        # Handle Tables
        if stripped.startswith("|"):
            in_table = True
            table_lines.append(stripped)
            i += 1
            continue
        elif in_table:
            flush_table()

        # Skip horizontal rules
        if stripped in ("---", "***", "___"):
            i += 1
            continue

        # Blank line
        if not stripped:
            i += 1
            continue

        # Image check: ![Alt](path)
        img_match = re.match(r"^!\[(.*?)\]\((.*?)\)$", stripped)
        if img_match:
            alt_text = img_match.group(1)
            img_rel_path = img_match.group(2)
            
            # Resolve image path
            img_full_path = os.path.normpath(os.path.join(img_base_dir, img_rel_path))
            if os.path.exists(img_full_path):
                img_p = doc.add_paragraph()
                img_p.alignment = WD_ALIGN_PARAGRAPH.CENTER
                img_p.paragraph_format.space_before = Pt(8)
                img_p.paragraph_format.space_after = Pt(2)
                run = img_p.add_run()
                run.add_picture(img_full_path, width=Inches(5.8))
                
                # Caption
                cap_p = doc.add_paragraph()
                cap_p.alignment = WD_ALIGN_PARAGRAPH.CENTER
                cap_p.paragraph_format.space_before = Pt(2)
                cap_p.paragraph_format.space_after = Pt(10)
                cap_run = cap_p.add_run(f"Figura: {alt_text}")
                cap_run.font.name = "Calibri"
                cap_run.font.size = Pt(8.5)
                cap_run.font.italic = True
                cap_run.font.color.rgb = RGBColor(0x64, 0x74, 0x8B)
            else:
                # Placeholder if image not found
                p = doc.add_paragraph()
                p.paragraph_format.space_after = Pt(4)
                run = p.add_run(f"[Imagen: {alt_text}]")
                run.italic = True
            i += 1
            continue

        # Headings
        if stripped.startswith("# "):
            h_text = stripped[2:].strip()
            p = doc.add_paragraph()
            p.alignment = WD_ALIGN_PARAGRAPH.LEFT
            p.paragraph_format.space_before = Pt(14)
            p.paragraph_format.space_after = Pt(6)
            run = p.add_run(h_text)
            run.font.name = "Calibri"
            run.font.size = Pt(22)
            run.bold = True
            run.font.color.rgb = RGBColor(0x0F, 0x17, 0x2A) # Navy 900
            i += 1
            continue

        if stripped.startswith("## "):
            h_text = stripped[3:].strip()
            p = doc.add_paragraph()
            p.paragraph_format.space_before = Pt(16)
            p.paragraph_format.space_after = Pt(4)
            run = p.add_run(h_text)
            run.font.name = "Calibri"
            run.font.size = Pt(15)
            run.bold = True
            run.font.color.rgb = RGBColor(0x0E, 0x74, 0x90) # Cyan/Teal
            i += 1
            continue

        if stripped.startswith("### "):
            h_text = stripped[4:].strip()
            p = doc.add_paragraph()
            p.paragraph_format.space_before = Pt(12)
            p.paragraph_format.space_after = Pt(3)
            run = p.add_run(h_text)
            run.font.name = "Calibri"
            run.font.size = Pt(12)
            run.bold = True
            run.font.color.rgb = RGBColor(0x03, 0x69, 0xA1) # Sky 700
            i += 1
            continue

        if stripped.startswith("#### "):
            h_text = stripped[5:].strip()
            p = doc.add_paragraph()
            p.paragraph_format.space_before = Pt(8)
            p.paragraph_format.space_after = Pt(2)
            run = p.add_run(h_text)
            run.font.name = "Calibri"
            run.font.size = Pt(10.5)
            run.bold = True
            run.font.color.rgb = RGBColor(0x33, 0x41, 0x55) # Slate 700
            i += 1
            continue

        # Bullet List items (* or -)
        bullet_match = re.match(r"^(\s*)[*-]\s+(.*)$", line)
        if bullet_match:
            indent = len(bullet_match.group(1))
            item_text = bullet_match.group(2)
            p = doc.add_paragraph(style='List Bullet')
            p.paragraph_format.space_before = Pt(1)
            p.paragraph_format.space_after = Pt(2)
            p.paragraph_format.left_indent = Inches(0.25 + (indent // 2) * 0.2)
            parse_inline_formatting(p, item_text, base_font="Calibri", base_size=10)
            i += 1
            continue

        # Numbered List items
        num_match = re.match(r"^(\s*)\d+\.\s+(.*)$", line)
        if num_match:
            indent = len(num_match.group(1))
            item_text = num_match.group(2)
            p = doc.add_paragraph(style='List Number')
            p.paragraph_format.space_before = Pt(1)
            p.paragraph_format.space_after = Pt(2)
            p.paragraph_format.left_indent = Inches(0.25 + (indent // 2) * 0.2)
            parse_inline_formatting(p, item_text, base_font="Calibri", base_size=10)
            i += 1
            continue

        # Standard Paragraph
        p = doc.add_paragraph()
        p.paragraph_format.space_before = Pt(2)
        p.paragraph_format.space_after = Pt(5)
        p.paragraph_format.line_spacing = 1.15
        parse_inline_formatting(p, stripped, base_font="Calibri", base_size=10.5)
        i += 1

    if in_table:
        flush_table()

    doc.save(docx_path)
    print(f"[OK] Generated: {docx_path}")

if __name__ == "__main__":
    docs_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    
    tasks = [
        ("MANUAL_PORTAL_MYPLAYAD.md", "MANUAL_PORTAL_MYPLAYAD.docx"),
        ("MANUAL_PRODUCTO_MYPLAYAD.md", "MANUAL_PRODUCTO_MYPLAYAD.docx")
    ]
    
    for md_name, docx_name in tasks:
        md_file = os.path.join(docs_dir, md_name)
        docx_file = os.path.join(docs_dir, docx_name)
        if os.path.exists(md_file):
            convert_markdown_to_docx(md_file, docx_file, docs_dir)
        else:
            print(f"[ERR] File not found: {md_file}")
