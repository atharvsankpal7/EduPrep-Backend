
import { describe, expect, test, mock, spyOn } from "bun:test";

// Mock the database helper module before importing the function under test
mock.module("../src/db/helpers/topic.helpers", () => {
    return {
        findTopicByName: async (name: string) => {
            return { id: 1, topicName: name };
        }
    };
});

// Mock logger to avoid cluttering output
mock.module("../src/utils/logger", () => {
    return {
        default: {
            error: () => {},
            info: () => {},
            warn: () => {},
        }
    };
});

// Import the function after mocking
import { processExcelData } from "../src/utils/excelProcessor";

describe("Excel Processor Security", () => {
    test("should sanitize CSV injection payloads", async () => {
        const maliciousRow = {
            question: "=1+1",
            option_1: "@SUM(1,1)",
            option_2: "+1-1",
            option_3: "-1+1",
            option_4: "Normal Option",
            answer: 1,
            subject: "Math",
            topics: "Algebra",
            standard: 10,
            explanation: "=cmd|' /C calc'!A0"
        };

        const result = await processExcelData([maliciousRow]);

        expect(result.length).toBe(1);

        // These assertions are expected to fail before the fix
        expect(result[0].questionText).toBe("'=1+1");
        expect(result[0].options[0]).toBe("'@SUM(1,1)");
        expect(result[0].options[1]).toBe("'+1-1");
        expect(result[0].options[2]).toBe("'-1+1");
        expect(result[0].options[3]).toBe("Normal Option");
        if (result[0].explanation) {
            expect(result[0].explanation).toBe("'=cmd|' /C calc'!A0");
        }
    });

    test("should not modify safe values", async () => {
        const safeRow = {
            question: "What is 1+1?",
            option_1: "2",
            option_2: "3",
            option_3: "4",
            option_4: "5",
            answer: 1,
            subject: "Math",
            topics: "Algebra",
            standard: 10,
            explanation: "Basic arithmetic"
        };

        const result = await processExcelData([safeRow]);

        expect(result.length).toBe(1);
        expect(result[0].questionText).toBe("What is 1+1?");
        expect(result[0].options[0]).toBe("2");
        expect(result[0].explanation).toBe("Basic arithmetic");
    });
});
