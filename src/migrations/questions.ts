import { Question } from "../models/questions/questions.model";
import mongoose from "mongoose";
import dotenv from "dotenv";
import logger from "../utils/logger";
import { Topic } from "../models/topics/topic.model";

dotenv.config();

const physicsQuestions = [
    // Error Analysis (questionCount: 1) - Creating 3 questions
    {
        topicName: "error analysis",
        questions: [
            {
                questionText: "What is the percentage error in the product of two quantities A and B, if the percentage error in A is 3% and in B is 4%?",
                options: ["1%", "7%", "12%", "5%"],
                answer: 1,
                standard: 11,
                explanation: "When multiplying quantities, percentage errors are added. So total error = 3% + 4% = 7%"
            },
            {
                questionText: "In an experiment, the length of a rod is measured as 2.51 ± 0.01 cm. The percentage error in the measurement is:",
                options: ["0.4%", "0.04%", "4%", "40%"],
                answer: 0,
                standard: 11,
                explanation: "Percentage error = (Absolute error/Measured value) × 100 = (0.01/2.51) × 100 ≈ 0.4%"
            },
            {
                questionText: "Which of the following has the least percentage error? Mass = 50 ± 0.5 g, Length = 100 ± 1 cm, Time = 10 ± 0.1 s",
                options: ["Mass", "Length", "Time", "All have same error"],
                answer: 1,
                standard: 11,
                explanation: "Percentage error = (Absolute error/Measured value) × 100. For length it's 1%, mass is 1%, time is 1%. All have same percentage error."
            }
        ]
    },
    // Rotational Dynamics (questionCount: 3) - Creating 9 questions
    {
        topicName: "rotational dynamics",
        questions: [
            {
                questionText: "A solid sphere and a hollow sphere of the same mass and radius roll down an inclined plane. Which one reaches the bottom first?",
                options: ["Solid sphere", "Hollow sphere", "Both reach simultaneously", "Depends on the angle of inclination"],
                answer: 0,
                standard: 12,
                explanation: "Solid sphere has smaller moment of inertia (2MR²/5) compared to hollow sphere (2MR²/3), thus rolls faster"
            },
            {
                questionText: "What is the moment of inertia of a solid sphere about its diameter?",
                options: ["MR²/2", "2MR²/5", "2MR²/3", "MR²"],
                answer: 1,
                standard: 12,
                explanation: "The moment of inertia of a solid sphere about its diameter is 2MR²/5"
            },
            {
                questionText: "A wheel rotating at 20 rad/s is brought to rest in 4 seconds. The angular retardation is:",
                options: ["5 rad/s²", "80 rad/s²", "-5 rad/s²", "20 rad/s²"],
                answer: 2,
                standard: 12,
                explanation: "Angular retardation = (final angular velocity - initial angular velocity)/time = (0 - 20)/4 = -5 rad/s²"
            },
            {
                questionText: "The radius of gyration of a solid cylinder about its axis is:",
                options: ["R/√2", "R/2", "R", "R/√3"],
                answer: 0,
                standard: 12,
                explanation: "For a solid cylinder, K = R/√2 where R is the radius of the cylinder"
            },
            {
                questionText: "A solid cylinder rolls down an inclined plane. The ratio of rotational kinetic energy to total kinetic energy is:",
                options: ["1/2", "1/3", "1/4", "2/3"],
                answer: 1,
                standard: 12,
                explanation: "For a solid cylinder, the ratio of rotational KE to total KE is 1/3"
            },
            {
                questionText: "Angular momentum is conserved when:",
                options: ["Net force is zero", "Net torque is zero", "Both force and torque are zero", "Neither force nor torque is zero"],
                answer: 1,
                standard: 12,
                explanation: "Angular momentum is conserved when net external torque acting on the system is zero"
            },
            {
                questionText: "A disc of radius R is rotating with angular velocity ω. The linear velocity at a point R/2 from the center is:",
                options: ["ωR", "ωR/2", "2ωR", "ωR/4"],
                answer: 1,
                standard: 12,
                explanation: "Linear velocity at any point = rω, where r is distance from axis. Here r = R/2, so v = ωR/2"
            },
            {
                questionText: "The moment of inertia of a system depends on:",
                options: ["Mass only", "Distribution of mass only", "Both mass and its distribution", "Neither mass nor its distribution"],
                answer: 2,
                standard: 12,
                explanation: "Moment of inertia depends on both the mass and how that mass is distributed about the axis of rotation"
            },
            {
                questionText: "A particle moves in a circle of radius r with constant speed v. Its angular momentum about the center is:",
                options: ["mvr", "mv²r", "mv/r", "mv²/r"],
                answer: 0,
                standard: 12,
                explanation: "Angular momentum L = r × p = r × mv = mvr (perpendicular to plane of rotation)"
            }
        ]
    }
];

const mathsQuestions = [
    // Mathematics Logic (questionCount: 2) - Creating 6 questions
    {
        topicName: "mathematics logic",
        questions: [
            {
                questionText: "If p and q are propositions, then ~(p ∨ q) is logically equivalent to:",
                options: ["~p ∧ ~q", "~p ∨ ~q", "p ∧ q", "~(p ∧ q)"],
                answer: 0,
                standard: 12,
                explanation: "By De Morgan's Law, ~(p ∨ q) ≡ ~p ∧ ~q"
            },
            {
                questionText: "The negation of the statement 'All cats are black' is:",
                options: ["No cats are black", "Some cats are black", "Some cats are not black", "All cats are not black"],
                answer: 2,
                standard: 12,
                explanation: "The negation of 'All A are B' is 'Some A are not B'"
            },
            {
                questionText: "If p → q is true and q → r is true, then:",
                options: ["p → r must be true", "r → p must be true", "p ↔ r must be true", "None of these"],
                answer: 0,
                standard: 12,
                explanation: "This is an example of the Law of Syllogism: if p → q and q → r, then p → r"
            },
            {
                questionText: "The contrapositive of 'If it rains, then the ground is wet' is:",
                options: ["If it doesn't rain, then the ground is not wet", "If the ground is wet, then it rained", "If the ground is not wet, then it didn't rain", "If it rains, then the ground is not wet"],
                answer: 2,
                standard: 12,
                explanation: "The contrapositive of p → q is ~q → ~p"
            },
            {
                questionText: "Which of the following is a tautology?",
                options: ["p ∨ ~p", "p ∧ ~p", "p → q", "p ↔ q"],
                answer: 0,
                standard: 12,
                explanation: "p ∨ ~p is always true regardless of the truth value of p, making it a tautology"
            },
            {
                questionText: "If p and q are propositions, then p → q is logically equivalent to:",
                options: ["~p ∨ q", "~q ∨ p", "p ∧ q", "~p ∧ q"],
                answer: 0,
                standard: 12,
                explanation: "p → q is logically equivalent to ~p ∨ q"
            }
        ]
    }
];

async function createQuestions() {
    try {
        await mongoose.connect(process.env.MONGO_URI!);
        logger.info("Connected to MongoDB");

        for (const subject of [...physicsQuestions, ...mathsQuestions]) {
            // Find topic
            const topic = await Topic.findOne({ topicName: subject.topicName });
            if (!topic) {
                logger.error(`Topic not found: ${subject.topicName}`);
                continue;
            }

            // Create questions for this topic
            const questionsToCreate = subject.questions.map(q => ({
                ...q,
                topicIds: [topic._id]
            }));

            await Question.insertMany(questionsToCreate);
            logger.info(`Created ${questionsToCreate.length} questions for topic: ${subject.topicName}`);
        }

        logger.info("Questions creation completed successfully");
    } catch (error) {
        logger.error("Error in questions creation:", error);
        throw error;
    } finally {
        await mongoose.disconnect();
    }
}

createQuestions();