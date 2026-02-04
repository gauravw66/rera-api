import pandas as pd
import json

xl = pd.ExcelFile(r"g:/INTERNSHIP/rera-api/MahaRERA_Fields.xlsx")
result = {}
for sheet in xl.sheet_names:
    df = pd.read_excel(xl, sheet)
    if "Field Name" in df.columns and "Data Type" in df.columns:
        mapping = {}
        for _, row in df.iterrows():
            fn = row.get("Field Name")
            dt = row.get("Data Type")
            if isinstance(fn, str) and fn.strip():
                mapping[fn] = None if pd.isna(dt) else str(dt)
        result[sheet] = mapping
    else:
        result[sheet] = {"__columns__": df.columns.tolist()}

print(json.dumps(result, indent=2))
