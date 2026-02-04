import pandas as pd
try:
    xl = pd.ExcelFile(r'g:/INTERNSHIP/rera-api/MahaRERA_Fields.xlsx')
    print("Sheet Names:", xl.sheet_names)
    for sheet in xl.sheet_names:
        print(f"\n--- Sheet: {sheet} ---")
        df = pd.read_excel(xl, sheet)
        print(df.head().to_string())
        print("\nColumns:", df.columns.tolist())
        if "Field Name" in df.columns:
            fields = df["Field Name"].dropna().astype(str).tolist()
            print("\nField Names:")
            print(fields)
except Exception as e:
    print("Error reading excel:", e)
