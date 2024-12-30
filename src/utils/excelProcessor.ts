import { Subject } from "../models/topics/subject.model";
import { Topic } from "../models/topics/topic.model";
import { Domain } from "../models/topics/domain.model";
import { ExcelRowSchema } from "../ZodSchema/excelSchema";
import logger from "./logger";
import { ApiError } from "./ApiError";
import { z } from "zod";

interface ProcessedRow {
    questionText: string;
    options: string[];
    answer: number;
    topicIds: string[];
    explanation?: string;
}

export async function processExcelData(rows: any[]): Promise<ProcessedRow[]> {
    const processedQuestions: ProcessedRow[] = [];
    const subjectCache = new Map<string, any>();
    const topicCache = new Map<string, any>();

    try {
        // Find or create domain (assuming "juniorCollege" as default domain)
        const domain = await Domain.findOne({ domainName: "juniorCollege" });
        if (!domain) {
            throw new ApiError(404, "Domain not found");
        }

        for (const row of rows) {
            // Validate row data
            const validatedRow = ExcelRowSchema.parse(row);

            // Process subject
            let subject = subjectCache.get(validatedRow.subject);
            if (!subject) {
                subject = await Subject.findOne({
                    subjectName: validatedRow.subject,
                    domainId: domain._id
                });

                if (!subject) {
                    subject = await Subject.create({
                        subjectName: validatedRow.subject,
                        domainId: domain._id
                    });
                    logger.info(`Created new subject: ${validatedRow.subject}`);
                }
                subjectCache.set(validatedRow.subject, subject);
            }

            // Process topics
            const topicIds: string[] = [];
            const topics = validatedRow.topics.split(',').map(t => t.trim());

            for (const topicName of topics) {
                const cacheKey = `${validatedRow.subject}-${topicName}`;
                let topic = topicCache.get(cacheKey);

                if (!topic) {
                    topic = await Topic.findOne({
                        topicName,
                        subjectId: subject._id
                    });

                    if (!topic) {
                        topic = await Topic.create({
                            topicName,
                            subjectId: subject._id
                        });
                        logger.info(`Created new topic: ${topicName} for subject: ${validatedRow.subject}`);
                    }
                    topicCache.set(cacheKey, topic);
                }
                topicIds.push(topic._id.toString());
            }

            // Prepare question data
            processedQuestions.push({
                questionText: validatedRow.question,
                options: [
                    validatedRow.option_1,
                    validatedRow.option_2,
                    validatedRow.option_3,
                    validatedRow.option_4,
                ],
                answer: validatedRow.answer,
                topicIds,
                explanation: validatedRow.explanation
            });
        }

        return processedQuestions;
    } catch (error) {
        if (error instanceof z.ZodError) {
            throw new ApiError(400, "Invalid data format in Excel file", error.errors);
        }
        throw error;
    }
}