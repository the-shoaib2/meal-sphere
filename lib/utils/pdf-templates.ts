import { formatDateForFilename } from "../excel/excel-utils";

export interface BuildDataReportPDFDocDefinitionParams {
  roomName: string;
  startDate: Date;
  endDate: Date;
  mainFont: string;
  mealCalendar?: any[][];
  shoppingResult?: { rows: any[] };
  paymentsResult?: { rows: any[] };
  balanceRows?: any[];
  calculationRows?: any[];
  expenseRows?: any[];
  scope?: 'all' | 'user' | 'individual';
  userId?: string;
  individualUserName?: string;
  type?: string;
}

// The function to build the PDF document definition for the data report
export function buildDataReportPDFDocDefinition({
  roomName,
  startDate,
  endDate,
  mainFont,
  mealCalendar = [],
  shoppingResult = { rows: [] },
  paymentsResult = { rows: [] },
  balanceRows = [],
  calculationRows = [],
  expenseRows = [],
  scope = 'all',
  userId = undefined,
  individualUserName = '',
  type = 'all',
}: BuildDataReportPDFDocDefinitionParams) {
  const docDefinition: any = {
    content: [],
    defaultStyle: { font: mainFont },
    styles: {
      header: { fontSize: 22, bold: true, alignment: 'center', margin: [0, 0, 0, 8] },
      subheader: { fontSize: 14, bold: true, alignment: 'center', margin: [0, 0, 0, 6] },
      tableHeader: { bold: true, fontSize: 10, fillColor: '#428bca', color: 'white', alignment: 'center' },
      tableCell: { fontSize: 9, alignment: 'center' },
    },
    pageMargins: [18, 24, 18, 24],
  };

  // Title
  docDefinition.content.push({ text: roomName, style: 'header', font: mainFont });
  docDefinition.content.push({ text: 'Data Report', style: 'subheader', font: mainFont });
  docDefinition.content.push({ text: `${formatDateForFilename(startDate)} to ${formatDateForFilename(endDate)}`, alignment: 'center', margin: [0, 0, 0, 16], font: mainFont });

  // Minimal table rendering helper
  function renderMinimalTable(header: string[], rows: any[][], title: string) {
    if (!header || header.length === 0) return;
    const maxCols = 19; // reduced max columns per table before splitting for narrower tables
    const isCalendarFormat = title.toLowerCase().includes('calendar') && header.length > maxCols;
    // Split columns if too many, always include the first column in every chunk
    const firstCol = header[0];
    const otherCols = header.slice(1);
    const columnChunks: string[][] = [];
    for (let i = 0; i < otherCols.length; i += maxCols - 1) {
      const chunk = [firstCol, ...otherCols.slice(i, i + maxCols - 1)];
      columnChunks.push(chunk);
    }
    columnChunks.forEach((colChunk, chunkIdx) => {
      // Prepare rows for this chunk, always include first column data
      const chunkRows = rows.map(row => {
        if (Array.isArray(row)) {
          // Always include first column, then the chunk's other columns
          const first = row[0];
          const indices = colChunk.map(col => header.indexOf(col));
          return indices.map(idx => row[idx]);
        } else {
          return colChunk.map(col => row[col]);
        }
      });
      // Column widths: first column wider, calendar format narrower
      const widths = colChunk.map((col, idx) => {
        if (idx === 0) return isCalendarFormat ? 60 : 120;
        return isCalendarFormat ? 18 : 20;
      });
      // Section title styling
      docDefinition.content.push({
        text: title + (columnChunks.length > 1 ? ` (Part ${chunkIdx + 1})` : ''),
        margin: [0, 10, 0, 4],
        font: mainFont,
        fontSize: 12,
        bold: true,
        color: '#222',
        decoration: 'underline',
      });
      // If no data, show empty state
      if (!chunkRows.length) {
        docDefinition.content.push({
          text: 'No data',
          italics: true,
          color: '#888',
          margin: [0, 0, 0, 8],
          font: mainFont,
        });
        return;
      }
      docDefinition.content.push({
        table: {
          headerRows: 1,
          widths,
          body: [
            colChunk.map((col, idx) => ({
              text: col,
              style: 'tableHeader',
              font: mainFont,
              fontSize: 8,
              color: '#fff',
              fillColor: '#428bca',
              alignment: idx === 0 ? 'left' : 'center',
              margin: [0, 2, 0, 2],
            })),
            ...chunkRows.map((row, rowIdx) => row.map((cell, idx) => ({
              text: cell != null ? String(cell) : '',
              font: mainFont,
              fontSize: 8,
              alignment: idx === 0 ? 'left' : 'center',
              margin: [0, 2, 0, 2],
              fillColor: rowIdx % 2 === 0 ? '#f9f9f9' : '#e9e9ef',
              color: '#222',
            })))
          ],
        },
        layout: {
          defaultBorder: false,
          paddingLeft: function() { return 4; },
          paddingRight: function() { return 4; },
          paddingTop: function() { return 2; },
          paddingBottom: function() { return 2; },
        },
        margin: [0, 0, 0, 8],
      });
    });
  }

  // Meals Calendar (if present)
  if (mealCalendar.length > 1) {
    const [header, ...rows] = mealCalendar;
    renderMinimalTable(header, rows, 'Meals Calendar');
  }

  // Shopping
  if (shoppingResult && shoppingResult.rows && shoppingResult.rows.length > 0) {
    const shoppingHeader = Object.keys(shoppingResult.rows[0]);
    const shoppingRows = shoppingResult.rows.map((row: any) => shoppingHeader.map(col => row[col]));
    renderMinimalTable(shoppingHeader, shoppingRows, 'Shopping');
  }

  // Payments
  if (paymentsResult && paymentsResult.rows && paymentsResult.rows.length > 0) {
    const paymentsHeader = Object.keys(paymentsResult.rows[0]);
    const paymentsRows = paymentsResult.rows.map((row: any) => paymentsHeader.map(col => row[col]));
    renderMinimalTable(paymentsHeader, paymentsRows, 'Payments');
  }

  // Balances
  if (balanceRows && balanceRows.length > 0) {
    const balancesHeader = Object.keys(balanceRows[0]);
    const balancesRows = balanceRows.map((row: any) => balancesHeader.map(col => row[col]));
    renderMinimalTable(balancesHeader, balancesRows, 'Balances');
  }

  // Calculations
  if (calculationRows && calculationRows.length > 0) {
    const calculationsHeader = Object.keys(calculationRows[0]);
    const calculationsRows = calculationRows.map((row: any) => calculationsHeader.map(col => row[col]));
    renderMinimalTable(calculationsHeader, calculationsRows, 'Calculations');
  }

  // Expenses
  if (expenseRows && expenseRows.length > 0 && Array.isArray(expenseRows[0])) {
    // expenseRows is already an array of arrays
    const expenseHeader = ['Date', 'Name', 'Amount', 'Description'];
    renderMinimalTable(expenseHeader, expenseRows, 'Expenses');
  }

  return docDefinition;
} 