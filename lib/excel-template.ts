import * as XLSX from "xlsx"

export function generateMealImportTemplate() {
  // Create sample data
  const data = [
    {
      Date: "2024-05-01",
      Name: "John Doe",
      Breakfast: 1,
      Lunch: 1,
      Dinner: 0,
      Total: 2,
    },
    {
      Date: "2024-05-01",
      Name: "Jane Smith",
      Breakfast: 0,
      Lunch: 1,
      Dinner: 1,
      Total: 2,
    },
    {
      Date: "2024-05-02",
      Name: "John Doe",
      Breakfast: 1,
      Lunch: 0,
      Dinner: 1,
      Total: 2,
    },
    {
      Date: "2024-05-02",
      Name: "Jane Smith",
      Breakfast: 1,
      Lunch: 1,
      Dinner: 1,
      Total: 3,
    },
  ]

  // Create a worksheet
  const worksheet = XLSX.utils.json_to_sheet(data)

  // Set column widths
  const columnWidths = [
    { wch: 12 }, // Date
    { wch: 20 }, // Name
    { wch: 10 }, // Breakfast
    { wch: 10 }, // Lunch
    { wch: 10 }, // Dinner
    { wch: 10 }, // Total
  ]
  worksheet["!cols"] = columnWidths

  // Create a workbook
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, "Meals Template")

  // Add instructions sheet
  const instructions = [
    { A: "Instructions for Meal Import Template" },
    { A: "" },
    { A: "1. Date: Use YYYY-MM-DD format (e.g., 2024-05-01)" },
    { A: "2. Name: Must match exactly with the user name in the system" },
    { A: "3. Breakfast, Lunch, Dinner: Use 1 for present, 0 for absent" },
    { A: "4. Total: Optional, will be calculated by the system" },
    { A: "" },
    { A: "Notes:" },
    { A: "- Do not change the column headers" },
    { A: "- Make sure all users exist in the selected room" },
    { A: "- Existing meal data for the same user and date will be overwritten" },
  ]
  const instructionsSheet = XLSX.utils.json_to_sheet(instructions, { skipHeader: true })
  XLSX.utils.book_append_sheet(workbook, instructionsSheet, "Instructions")

  // Generate Excel file
  const excelBuffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" })

  return {
    buffer: excelBuffer,
    filename: "MealSphere_Import_Template.xlsx",
  }
}
