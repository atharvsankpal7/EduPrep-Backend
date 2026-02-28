import { parentPort, workerData } from "worker_threads";
import * as ExcelJS from "exceljs";
import { z } from "zod";

const ExcelRowSchema = z.object({
    question: z.string().min(1, "Question is required"),
    option_1: z
        .union([z.string(), z.number().transform(String)])
        .pipe(z.string().min(1, "Option 1 is required")),
    option_2: z
        .union([z.string(), z.number().transform(String)])
        .pipe(z.string().min(1, "Option 2 is required")),
    option_3: z
        .union([z.string(), z.number().transform(String)])
        .pipe(z.string().min(1, "Option 3 is required")),
    option_4: z
        .union([z.string(), z.number().transform(String)])
        .pipe(z.string().min(1, "Option 4 is required")),
    answer: z
        .union([z.string().transform(Number), z.number()])
        .pipe(z.number().min(1, "Answer is required")),
    subject: z
        .string()
        .min(1, "Subject is required")
        .transform((str) => str.toLowerCase()),
    topics: z
        .string()
        .min(1, "Topics are required")
        .transform((str) => str.toLowerCase()),
    standard: z.number().min(1, "Standard is required"),
    explanation: z.string().optional().default(""),
});

type ExcelRow = z.infer<typeof ExcelRowSchema>;

export interface ValidatedRow {
    data: ExcelRow;
    originalIndex: number;
}

export interface WorkerResult {
    rows: ValidatedRow[];
    uniqueTopics: string[];
    errors: string[];
}

function sanitizeForCSV(value: string): string {
    if (/^[=+\-@]/.test(value)) {
        return `'${value}`;
    }
    return value;
}

async function parseAndValidate(filePath: string): Promise<WorkerResult> {
    const errors: string[] = [];
    const validatedRows: ValidatedRow[] = [];
    const uniqueTopics = new Set<string>();

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(filePath);
    const worksheet = workbook.worksheets[0];

    const headers: { [key: number]: string } = {};
    const headerRow = worksheet.getRow(1);
    headerRow.eachCell((cell, colNumber) => {
        headers[colNumber] = cell.text ? cell.text.toString() : "";
    });

    const sheetData: unknown[] = [];
    worksheet.eachRow((row, rowNumber) => {
        if (rowNumber === 1) return;
        const rowData: Record<string, string> = {};

        Object.values(headers).forEach((header) => {
            if (header) rowData[header] = "";
        });

        row.eachCell((cell, colNumber) => {
            const header = headers[colNumber];
            if (header) {
                let cellValue = "";
                if (cell.value !== null && cell.value !== undefined) {
                    if (typeof cell.value === "object") {
                        if ("text" in cell.value) {
                            cellValue = (cell.value as any).text;
                        } else if ("result" in cell.value) {
                            cellValue = String((cell.value as any).result);
                        } else {
                            cellValue = String(cell.value);
                        }
                    } else {
                        cellValue = String(cell.value);
                    }
                }
                rowData[header] = cellValue;
            }
        });
        sheetData.push(rowData);
    });

    for (let index = 0; index < sheetData.length; index++) {
        const row = sheetData[index];
        const validation = ExcelRowSchema.safeParse(row);

        if (!validation.success) {
            errors.push(
                `Invalid data in Excel row ${index + 2}: ${JSON.stringify(row)}`
            );
            continue;
        }

        const validatedRow = validation.data;

        validatedRow.question = sanitizeForCSV(validatedRow.question);
        validatedRow.option_1 = sanitizeForCSV(validatedRow.option_1);
        validatedRow.option_2 = sanitizeForCSV(validatedRow.option_2);
        validatedRow.option_3 = sanitizeForCSV(validatedRow.option_3);
        validatedRow.option_4 = sanitizeForCSV(validatedRow.option_4);
        validatedRow.explanation = sanitizeForCSV(validatedRow.explanation);

        const topicName = validatedRow.topics.trim();
        uniqueTopics.add(topicName);

        validatedRows.push({ data: validatedRow, originalIndex: index });
    }

    return {
        rows: validatedRows,
        uniqueTopics: Array.from(uniqueTopics),
        errors,
    };
}

(async () => {
    try {
        const { filePath } = workerData as { filePath: string };
        const result = await parseAndValidate(filePath);
        parentPort!.postMessage(result);
    } catch (err: any) {
        parentPort!.postMessage({
            rows: [],
            uniqueTopics: [],
            errors: [`Worker fatal error: ${err.message}`],
        });
    }
})();
