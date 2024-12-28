import {z} from "zod";

const customTestSchema = z.object({
    time: z.number().positive('Test duration must be positive'),
    numberOfQuestions: z.number().positive('Number of questions must be positive'),
    topicList: z.object({
        subjects: z.array(z.object({
            subjectName: z.string(),
            topics: z.array(z.string())
        })).min(1, 'At least one subject is required')
    }),
    educationLevel: z.enum(['undergraduate', 'juniorCollege'])
});
export {customTestSchema};