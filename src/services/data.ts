import * as d3 from "d3";

export const readCSV = async (file: string) => {
  try {
    return await d3.csv(file);
  } catch (e) {
    console.error("Error loading the CSV file: ", e);
  }
};

export const readJSON = async (file: string) => {
  try {
    return await d3.json(file);
  } catch (e) {
    console.error("Error loading the JSON file:", e);
  }
};

export class CsvDataService {
  static exportToCsv(filename: string, rows: object[]) {
    if (!rows || !rows.length) {
      return;
    }
    const separator = ",";
    const keys = Object.keys(rows[0]);
    const csvData =
      keys.join(separator) +
      "\n" +
      rows
        .map((row) => {
          return keys
            .map((k) => {
              let cell = row[k] === null || row[k] === undefined ? "" : row[k];
              cell =
                cell instanceof Date
                  ? cell.toLocaleString()
                  : cell.toString().replace(/"/g, '""');
              if (cell.search(/("|,|\n)/g) >= 0) {
                cell = `"${cell}"`;
              }
              return cell;
            })
            .join(separator);
        })
        .join("\n");

    const blob = new Blob([csvData], { type: "text/csv;charset=utf-8;" });

    if (typeof window !== "undefined") {
      const link = document.createElement("a");
      if (link.download !== undefined) {
        // Browsers that support HTML5 download attribute
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", filename);
        link.style.visibility = "hidden";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    }
    // }
  }
}
