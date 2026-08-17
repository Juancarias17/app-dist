import ExcelJS from 'exceljs'
import { saveAs } from 'file-saver'

export interface SheetDefinition {
  name: string
  columns: { header: string; key: string; format?: (v: unknown) => string }[]
  data: unknown[]
}

export async function exportToExcel(sheets: SheetDefinition[], filename: string) {
  const wb = new ExcelJS.Workbook()

  for (const sheet of sheets) {
    const ws = wb.addWorksheet(sheet.name)

    ws.columns = sheet.columns.map((col) => ({
      header: col.header,
      key: col.key,
      width: Math.max(col.header.length + 2, 12),
    }))

    const headerRow = ws.getRow(1)
    headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } }
    headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0B2035' } }
    headerRow.commit()

    for (const row of sheet.data) {
      const r = row as Record<string, unknown>
      const values: Record<string, unknown> = {}
      for (const col of sheet.columns) {
        values[col.key] = col.format ? col.format(r[col.key]) : r[col.key]
      }
      ws.addRow(values)
    }

    ws.eachRow((row) => {
      row.eachCell((cell) => {
        cell.border = {
          top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          right: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        }
      })
    })
  }

  const buf = await wb.xlsx.writeBuffer()
  const blob = new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
  saveAs(blob, `${filename}.xlsx`)
}
