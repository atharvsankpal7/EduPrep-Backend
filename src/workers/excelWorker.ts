import { parentPort, workerData } from "worker_threads";
import * as XLSX from "xlsx";

if (!workerData || !workerData.filePath) {
    throw new Error("filePath is required in workerData");
}

try {
    const workbook = XLSX.readFile(workerData.filePath);
    const sheetName = workbook.SheetNames[0];
    const sheetData = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { defval: "" });

    if (parentPort) {
        parentPort.postMessage({ success: true, data: sheetData });
    }
} catch (error) {
    if (parentPort) {
        parentPort.postMessage({ success: false, error: error instanceof Error ? error.message : String(error) });
    }
}
