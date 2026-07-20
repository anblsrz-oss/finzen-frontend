// Los módulos pesados (exceljs) se cargan de forma diferida (dynamic import)
// para no inflar el bundle inicial ni el precache del PWA.
import type ExcelJSNS from 'exceljs'

export type ExportMode = 'tables' | 'charts' | 'both'

export interface MonthlyExportRow {
  monthLabel: string
  income: number
  expense: number
}

export interface CategoryExportRow {
  icon: string
  name: string
  total: number
}

export interface TxExportRow {
  date: string
  concept: string
  category: string
  kind: string
  amount: number
  currency: string
}

export interface ChartExport {
  title: string
  el: HTMLElement | null
}

export interface ExportOptions {
  mode: ExportMode
  fileName: string
  monthly: MonthlyExportRow[]
  categories: CategoryExportRow[]
  transactions: TxExportRow[]
  charts: ChartExport[]
}

const MONEY_FMT = '#,##0.00'

function styleHeader(row: ExcelJSNS.Row) {
  row.font = { bold: true }
  row.eachCell((cell) => {
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF0F766E' },
    }
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' } }
  })
}

// Genera y descarga un .xlsx con las tablas y/o imágenes de las gráficas de
// reportes, según el modo elegido (solo tablas, solo gráficos, o ambos).
export async function exportReportToExcel(opts: ExportOptions): Promise<void> {
  const ExcelJS = (await import('exceljs')).default
  const { saveAs } = await import('file-saver')

  const wb = new ExcelJS.Workbook()
  wb.creator = 'Ahorbit'

  if (opts.mode !== 'charts') {
    // --- Hoja: Por mes ---
    const ms = wb.addWorksheet('Por mes')
    ms.columns = [
      { header: 'Mes', key: 'month', width: 18 },
      { header: 'Ingresos', key: 'income', width: 16 },
      { header: 'Egresos', key: 'expense', width: 16 },
    ]
    styleHeader(ms.getRow(1))
    opts.monthly.forEach((r) => {
      const row = ms.addRow({ month: r.monthLabel, income: r.income, expense: r.expense })
      row.getCell('income').numFmt = MONEY_FMT
      row.getCell('expense').numFmt = MONEY_FMT
    })

    // --- Hoja: Por categoría ---
    const cs = wb.addWorksheet('Por categoría')
    cs.columns = [
      { header: 'Categoría', key: 'name', width: 28 },
      { header: 'Total', key: 'total', width: 16 },
    ]
    styleHeader(cs.getRow(1))
    opts.categories.forEach((r) => {
      const row = cs.addRow({ name: `${r.icon} ${r.name}`.trim(), total: r.total })
      row.getCell('total').numFmt = MONEY_FMT
    })

    // --- Hoja: Movimientos ---
    const ts = wb.addWorksheet('Movimientos')
    ts.columns = [
      { header: 'Fecha', key: 'date', width: 14 },
      { header: 'Concepto', key: 'concept', width: 32 },
      { header: 'Categoría', key: 'category', width: 22 },
      { header: 'Tipo', key: 'kind', width: 12 },
      { header: 'Monto', key: 'amount', width: 16 },
      { header: 'Moneda', key: 'currency', width: 10 },
    ]
    styleHeader(ts.getRow(1))
    opts.transactions.forEach((r) => {
      const row = ts.addRow(r)
      row.getCell('amount').numFmt = MONEY_FMT
    })
  }

  if (opts.mode !== 'tables') {
    const { toPng } = await import('html-to-image')
    // --- Hoja: Gráficas (imágenes PNG capturadas del DOM) ---
    const gs = wb.addWorksheet('Gráficas')
    gs.getColumn(1).width = 90
    let anchorRow = 0
    for (const chart of opts.charts) {
      if (!chart.el) continue
      const titleCell = gs.getCell(anchorRow + 1, 1)
      titleCell.value = chart.title
      titleCell.font = { bold: true, size: 14 }
      // Capturar la gráfica como PNG.
      const dataUrl = await toPng(chart.el, { backgroundColor: '#ffffff', pixelRatio: 2 })
      const imageId = wb.addImage({ base64: dataUrl, extension: 'png' })
      gs.addImage(imageId, {
        tl: { col: 0, row: anchorRow + 1 },
        ext: { width: 620, height: 320 },
      })
      // Dejar espacio bajo la imagen antes de la siguiente gráfica.
      anchorRow += 20
    }
  }

  const buffer = await wb.xlsx.writeBuffer()
  saveAs(
    new Blob([buffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    }),
    opts.fileName,
  )
}
