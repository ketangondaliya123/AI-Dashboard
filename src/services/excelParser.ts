import * as XLSX from 'xlsx';

export interface ParsedSheetData {
  sheetName: string;
  headers: string[];
  rows: any[];
}

export const excelParser = {
  /**
   * Reads an Excel file and returns sheet names along with their parsed row arrays.
   */
  async parseExcel(file: File): Promise<{
    sheetsData: Record<string, ParsedSheetData>;
    sheetNames: string[];
  }> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (e) => {
        try {
          const data = e.target?.result;
          if (!data) {
            throw new Error("No data loaded from file");
          }

          // Parse workbook
          const workbook = XLSX.read(data, { type: 'array', cellDates: true });
          const sheetNames = workbook.SheetNames;
          const sheetsData: Record<string, ParsedSheetData> = {};

          if (sheetNames.length === 0) {
            throw new Error("The Excel file does not contain any sheets.");
          }

          for (const sheetName of sheetNames) {
            const sheet = workbook.Sheets[sheetName];
            
            // Extract sheet as a 2D array of raw values to identify headers dynamically
            const rawRows = XLSX.utils.sheet_to_json<any[]>(sheet, { header: 1, defval: null });
            
            if (rawRows.length === 0) {
              sheetsData[sheetName] = { sheetName, headers: [], rows: [] };
              continue;
            }

            // Find the best header row in the first 10 rows
            const maxHeaderScan = Math.min(rawRows.length, 10);
            let bestHeaderIndex = 0;
            let highestScore = -Infinity;

            for (let i = 0; i < maxHeaderScan; i++) {
              const row = rawRows[i];
              if (!row || !Array.isArray(row)) continue;

              let stringCount = 0;
              let numberCount = 0;
              let nullCount = 0;
              const values = new Set<string>();

              for (const cell of row) {
                if (cell === null || cell === undefined || cell === "") {
                  nullCount++;
                } else if (typeof cell === 'number') {
                  numberCount++;
                } else {
                  stringCount++;
                  values.add(String(cell).trim().toLowerCase());
                }
              }

              const totalCells = row.length;
              if (totalCells === 0) continue;

              // Heuristic score:
              // - High unique strings count is favored
              // - Numbers are penalized (headers should not be numbers)
              // - Empty/Null cells are penalized
              // - Must have at least 2 distinct strings
              if (values.size < 2) continue;

              const score = values.size * 2.0 - numberCount * 3.0 - nullCount * 0.5;

              if (score > highestScore) {
                highestScore = score;
                bestHeaderIndex = i;
              }
            }

            // Extract the chosen header row
            const rawHeaders = rawRows[bestHeaderIndex];
            if (!rawHeaders || !Array.isArray(rawHeaders)) {
              sheetsData[sheetName] = { sheetName, headers: [], rows: [] };
              continue;
            }

            // Normalize headers: clean empty cells, replace duplicates, trim
            const headers = rawHeaders.map((h, index) => {
              const strVal = h !== null && h !== undefined ? String(h).trim() : '';
              return strVal || `COLUMN_${index + 1}`;
            });

            // Handle duplicate header names by appending suffixes
            const seenHeaders: Record<string, number> = {};
            const uniqueHeaders = headers.map(h => {
              if (seenHeaders[h] !== undefined) {
                seenHeaders[h]++;
                return `${h}_${seenHeaders[h]}`;
              } else {
                seenHeaders[h] = 0;
                return h;
              }
            });

            // Check if we should calculate Net Revenue dynamically
            const brokKey = uniqueHeaders.find(h => h.toLowerCase().includes('brok') && !h.toLowerCase().includes('yield'));
            const passoutKey = uniqueHeaders.find(h => h.toLowerCase().includes('passout') || h.toLowerCase().includes('cppassout'));
            const hasNetRevenue = !!(brokKey && passoutKey);

            if (hasNetRevenue && !uniqueHeaders.includes('Net Revenue')) {
              uniqueHeaders.push('Net Revenue');
            }

            // Convert remaining rows into object arrays mapped to our headers
            const rows: any[] = [];
            for (let j = bestHeaderIndex + 1; j < rawRows.length; j++) {
              const rowData = rawRows[j];
              if (!rowData || !Array.isArray(rowData)) continue;

              // Skip rows that are completely empty
              const isEmpty = rowData.every(cell => cell === null || cell === undefined || cell === "");
              if (isEmpty) continue;

              const rowObject: Record<string, any> = {};
              let hasData = false;

              uniqueHeaders.forEach((header, index) => {
                if (header === 'Net Revenue') return; // Handled separately
                
                let cellValue = rowData[index];

                // Parse numeric strings as actual numbers
                if (typeof cellValue === 'string') {
                  const cleanedValue = cellValue.replace(/,/g, '').trim();
                  if (cleanedValue !== '' && !isNaN(Number(cleanedValue))) {
                    cellValue = Number(cleanedValue);
                  }
                }

                if (cellValue !== null && cellValue !== undefined && cellValue !== "") {
                  rowObject[header] = cellValue;
                  hasData = true;
                }
              });

              if (hasNetRevenue && brokKey && passoutKey) {
                const brokVal = rowObject[brokKey] || 0;
                const passoutVal = rowObject[passoutKey] || 0;
                rowObject['Net Revenue'] = Number((brokVal - passoutVal).toFixed(2));
                hasData = true;
              }

              if (hasData) {
                rows.push(rowObject);
              }
            }

            sheetsData[sheetName] = {
              sheetName,
              headers: uniqueHeaders,
              rows,
            };
          }

          resolve({ sheetsData, sheetNames });
        } catch (error) {
          reject(error);
        }
      };

      reader.onerror = () => {
        reject(new Error("File could not be read."));
      };

      reader.readAsArrayBuffer(file);
    });
  }
};
