import docx
from docx.shared import Inches, Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT, WD_ALIGN_VERTICAL
from docx.oxml import OxmlElement, parse_xml
from docx.oxml.ns import nsdecls, qn

EMERALD = RGBColor(5, 150, 105)       # Primary #059669
NAVY = RGBColor(30, 41, 59)           # Dark Slate #1E293B
MUTED = RGBColor(100, 116, 139)       # Slate Gray #64748B
LIGHT_BG = "F8FAFC"                  # Slate 50
HEADER_BG = "0F766E"                 # Teal / Emerald 700
BORDER_COLOR = "CBD5E1"              # Slate 300

def set_cell_background(cell, hex_color):
    tcPr = cell._tc.get_or_add_tcPr()
    shd = parse_xml(f'<w:shd {nsdecls("w")} w:fill="{hex_color}"/>')
    tcPr.append(shd)

def set_cell_margins(cell, top=100, bottom=100, left=150, right=150):
    tcPr = cell._tc.get_or_add_tcPr()
    tcMar = parse_xml(f'<w:tcMar {nsdecls("w")}><w:top w:w="{top}" w:type="dxa"/><w:bottom w:w="{bottom}" w:type="dxa"/><w:left w:w="{left}" w:type="dxa"/><w:right w:w="{right}" w:type="dxa"/></w:tcMar>')
    tcPr.append(tcMar)

def create_styled_document():
    doc = docx.Document()
    # Set page margins to 1 inch
    sections = doc.sections
    for section in sections:
        section.top_margin = Inches(1.0)
        section.bottom_margin = Inches(1.0)
        section.left_margin = Inches(1.0)
        section.right_margin = Inches(1.0)
    
    # Configure Normal style font
    normal_style = doc.styles['Normal']
    normal_style.font.name = 'Calibri'
    normal_style.font.size = Pt(11)
    normal_style.font.color.rgb = RGBColor(30, 41, 59)
    normal_style.paragraph_format.line_spacing = 1.15
    normal_style.paragraph_format.space_after = Pt(6)
    
    return doc

def add_title_page(doc, module_code, module_title, project_title, subtitle, authors, institution, date_str):
    # Spacing
    p = doc.add_paragraph()
    p.paragraph_format.space_before = Pt(40)
    
    # Module info
    p_mod = doc.add_paragraph()
    p_mod.alignment = WD_ALIGN_PARAGRAPH.CENTER
    run_mod = p_mod.add_run(f"{module_code}: {module_title}")
    run_mod.font.size = Pt(13)
    run_mod.font.bold = True
    run_mod.font.color.rgb = EMERALD
    
    # Project Title
    p_title = doc.add_paragraph()
    p_title.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p_title.paragraph_format.space_before = Pt(18)
    p_title.paragraph_format.space_after = Pt(8)
    run_title = p_title.add_run(project_title)
    run_title.font.size = Pt(26)
    run_title.font.bold = True
    run_title.font.color.rgb = NAVY
    
    # Subtitle
    if subtitle:
        p_sub = doc.add_paragraph()
        p_sub.alignment = WD_ALIGN_PARAGRAPH.CENTER
        p_sub.paragraph_format.space_after = Pt(40)
        run_sub = p_sub.add_run(subtitle)
        run_sub.font.size = Pt(14)
        run_sub.font.italic = True
        run_sub.font.color.rgb = MUTED
        
    # Authors Block
    p_auth_head = doc.add_paragraph()
    p_auth_head.alignment = WD_ALIGN_PARAGRAPH.CENTER
    run_ah = p_auth_head.add_run("Project Team & Authors:")
    run_ah.font.size = Pt(12)
    run_ah.font.bold = True
    run_ah.font.color.rgb = NAVY
    
    for author in authors:
        p_author = doc.add_paragraph()
        p_author.alignment = WD_ALIGN_PARAGRAPH.CENTER
        p_author.paragraph_format.space_after = Pt(2)
        run_a = p_author.add_run(f"{author['name']} (Matriculation ID: {author['id']}) – {author['role']}")
        run_a.font.size = Pt(11)
        run_a.font.color.rgb = RGBColor(51, 65, 85)
        
    # Institution & Date
    p_inst = doc.add_paragraph()
    p_inst.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p_inst.paragraph_format.space_before = Pt(60)
    p_inst.paragraph_format.space_after = Pt(4)
    run_inst = p_inst.add_run(institution)
    run_inst.font.size = Pt(12)
    run_inst.font.bold = True
    run_inst.font.color.rgb = NAVY
    
    p_date = doc.add_paragraph()
    p_date.alignment = WD_ALIGN_PARAGRAPH.CENTER
    run_date = p_date.add_run(date_str)
    run_date.font.size = Pt(11)
    run_date.font.color.rgb = MUTED
    
    doc.add_page_break()

def add_custom_heading(doc, text, level):
    p = doc.add_paragraph()
    p.paragraph_format.keep_with_next = True
    run = p.add_run(text)
    run.font.bold = True
    
    if level == 1:
        p.paragraph_format.space_before = Pt(18)
        p.paragraph_format.space_after = Pt(6)
        run.font.size = Pt(18)
        run.font.color.rgb = NAVY
    elif level == 2:
        p.paragraph_format.space_before = Pt(14)
        p.paragraph_format.space_after = Pt(4)
        run.font.size = Pt(14)
        run.font.color.rgb = EMERALD
    elif level == 3:
        p.paragraph_format.space_before = Pt(10)
        p.paragraph_format.space_after = Pt(2)
        run.font.size = Pt(12)
        run.font.color.rgb = RGBColor(15, 118, 110)
    return p

def add_callout(doc, text, title=None):
    table = doc.add_table(rows=1, cols=1)
    table.alignment = WD_TABLE_ALIGNMENT.CENTER
    cell = table.cell(0, 0)
    cell.width = Inches(6.5)
    set_cell_background(cell, "F0FDF4") # Light emerald tint
    set_cell_margins(cell, top=140, bottom=140, left=200, right=200)
    
    # Left border emerald
    tcPr = cell._tc.get_or_add_tcPr()
    borders = parse_xml(f'<w:tcBorders {nsdecls("w")}><w:left w:val="single" w:sz="24" w:space="0" w:color="059669"/><w:top w:val="none"/><w:right w:val="none"/><w:bottom w:val="none"/></w:tcBorders>')
    tcPr.append(borders)
    
    p = cell.paragraphs[0]
    p.paragraph_format.space_after = Pt(2)
    if title:
        rt = p.add_run(f"{title}\n")
        rt.font.bold = True
        rt.font.size = Pt(11)
        rt.font.color.rgb = EMERALD
    r = p.add_run(text)
    r.font.size = Pt(10.5)
    r.font.italic = True
    r.font.color.rgb = RGBColor(30, 41, 59)
    doc.add_paragraph().paragraph_format.space_after = Pt(4)

def add_styled_table(doc, headers, data, col_widths=None):
    table = doc.add_table(rows=len(data) + 1, cols=len(headers))
    table.alignment = WD_TABLE_ALIGNMENT.CENTER
    
    # Header row
    hdr_cells = table.rows[0].cells
    for i, title in enumerate(headers):
        hdr_cells[i].text = title
        set_cell_background(hdr_cells[i], HEADER_BG)
        set_cell_margins(hdr_cells[i], top=120, bottom=120, left=140, right=140)
        p = hdr_cells[i].paragraphs[0]
        p.alignment = WD_ALIGN_PARAGRAPH.LEFT
        for run in p.runs:
            run.font.bold = True
            run.font.color.rgb = RGBColor(255, 255, 255)
            run.font.size = Pt(10)
            
    # Data rows
    for r_idx, row_values in enumerate(data):
        row_cells = table.rows[r_idx + 1].cells
        bg_col = LIGHT_BG if r_idx % 2 == 1 else "FFFFFF"
        for c_idx, val in enumerate(row_values):
            row_cells[c_idx].text = str(val)
            set_cell_background(row_cells[c_idx], bg_col)
            set_cell_margins(row_cells[c_idx], top=80, bottom=80, left=140, right=140)
            p = row_cells[c_idx].paragraphs[0]
            p.paragraph_format.space_after = Pt(0)
            for run in p.runs:
                run.font.size = Pt(9.5)
                run.font.color.rgb = RGBColor(30, 41, 59)
                
    # Column widths
    if col_widths:
        for row in table.rows:
            for idx, width in enumerate(col_widths):
                row.cells[idx].width = width
                
    doc.add_paragraph().paragraph_format.space_after = Pt(4)
    return table

