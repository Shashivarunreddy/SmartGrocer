import os
import shutil
from make_decision_guide import generate_decision_guide
from make_reflective_statements import generate_reflective_statements
from make_group_report import generate_group_report

DIR_1 = r"S:\Shashi\SmartGrocer\submission_docs"
DIR_2 = r"S:\Shashi\SmartGrocer\reportfromat and details\submission docs"

print("=========================================================")
print("GENERATING ACADEMIC SUBMISSION DOCUMENTS FOR SMARTGROCER")
print("=========================================================")

# Generate in DIR_1
generate_decision_guide(DIR_1)
generate_reflective_statements(DIR_1)
generate_group_report(DIR_1)

# Mirror to DIR_2
os.makedirs(DIR_2, exist_ok=True)
for item in os.listdir(DIR_1):
    src = os.path.join(DIR_1, item)
    dst = os.path.join(DIR_2, item)
    if os.path.isfile(src):
        shutil.copy2(src, dst)
        print(f"Copied {item} -> {DIR_2}")

print("\nAll submission documents successfully generated and synchronized!")

