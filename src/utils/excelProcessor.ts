import { ExcelRowSchema } from "../ZodSchema/excelSchema";
import logger from "./logger";
import { ApiError } from "./ApiError";
import { z } from "zod";
import { findTopicsByNames } from "../db/helpers/topic.helpers";

interface ProcessedRow {
  questionText: string;
  options: string[];
  answer: number;
  topicId: number;
  explanation?: string;
  standard: number;
}

export async function processExcelData(rows: any[]): Promise<ProcessedRow[]> {
  try {
    const validatedRows: { data: z.infer<typeof ExcelRowSchema>; index: number }[] = [];
    for (const [index, row] of rows.entries()) {
      const validation = ExcelRowSchema.safeParse(row);
      if (!validation.success) {
        logger.error(`Invalid data in Excel row ${index + 2}: ${JSON.stringify(row)}`);
        continue;
      }
      validatedRows.push({ data: validation.data, index });
    }

    const uniqueTopicNames = [
      ...new Set(validatedRows.map((r) => r.data.topics.toLowerCase().trimStart())),
    ];

    const resolvedTopics = await findTopicsByNames(uniqueTopicNames);
    const topicMap = new Map(resolvedTopics.map((t) => [t.topicName, t.id]));

    const processedQuestions: ProcessedRow[] = [];

    for (const { data: validatedRow, index } of validatedRows) {
      const topicName = validatedRow.topics.toLowerCase().trimStart();
      const topicId = topicMap.get(topicName);

      if (!topicId) {
        logger.error(`Invalid topic in Excel row ${index + 2}: ${topicName}`);
        continue;
      }

      processedQuestions.push({
        questionText: validatedRow.question,
        options: [
          validatedRow.option_1,
          validatedRow.option_2,
          validatedRow.option_3,
          validatedRow.option_4,
        ],
        answer: validatedRow.answer,
        topicId,
        explanation: validatedRow.explanation,
        standard: validatedRow.standard,
      });
    }

    return processedQuestions;
  } catch (error) {
    if (error instanceof z.ZodError) {
      logger.error("Validation error:", error);
      throw new ApiError(
        400,
        "Invalid data format in Excel file",
        error.errors.map((e) => e.message)
      );
    }
    throw error;
  }
}
