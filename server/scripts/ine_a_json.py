"""Convierte el nomenclátor de municipios del INE (diccionarioAA.xlsx) a JSON.

Uso: python3 ine_a_json.py entrada.xlsx salida.json
Columnas del INE: CODAUTO, CPRO, CMUN, DC, NOMBRE.
"""
import json
import sys

import openpyxl

entrada, salida = sys.argv[1], sys.argv[2]
hoja = openpyxl.load_workbook(entrada, read_only=True).active
municipios = []
cabecera = None
for fila in hoja.iter_rows(values_only=True):
    if cabecera is None:
        if fila and fila[0] == "CODAUTO":
            cabecera = fila
        continue
    if not fila or not fila[1] or not fila[2]:
        continue
    cpro, cmun, nombre = str(fila[1]).zfill(2), str(fila[2]).zfill(3), str(fila[4]).strip()
    municipios.append({"codigo": cpro + cmun, "nombre": nombre})

if len(municipios) < 8000:
    sys.exit(f"Nomenclátor sospechosamente pequeño: {len(municipios)} municipios")
municipios.sort(key=lambda m: m["codigo"])
with open(salida, "w", encoding="utf-8") as f:
    f.write("[\n" + ",\n".join(json.dumps(m, ensure_ascii=False) for m in municipios) + "\n]\n")
print(f"{len(municipios)} municipios")
