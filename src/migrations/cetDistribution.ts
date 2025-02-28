import { CETDistribution } from "../models/tests/cetDistribution.model";
import mongoose from "mongoose";
import dotenv from "dotenv";
import logger from "../utils/logger";
import { Topic } from "../models/topics/topic.model";
import { Subject } from "../models/topics/subject.model";
import { Domain } from "../models/topics/domain.model";

dotenv.config();

const physicsDistribution = {
  subject: "Physics",
  standard: 12,
  topics: [
    { topicName: "Rotational Dynamics", questionCount: 3, marksPerQuestion: 1 },
    { topicName: "Mechanical Properties of Fluids", questionCount: 3, marksPerQuestion: 1 },
    { topicName: "Kinetic Theory of Gases and Radiation", questionCount: 3, marksPerQuestion: 1 },
    { topicName: "Thermodynamics", questionCount: 3, marksPerQuestion: 1 },
    { topicName: "Oscillations", questionCount: 2, marksPerQuestion: 1 },
    { topicName: "Superposition of Waves", questionCount: 3, marksPerQuestion: 1 },
    { topicName: "Wave Optics", questionCount: 3, marksPerQuestion: 1 },
    { topicName: "Electrostatics", questionCount: 3, marksPerQuestion: 1 },
    { topicName: "Current Electricity", questionCount: 2, marksPerQuestion: 1 },
    { topicName: "Magnetic Fields due to Electric Current", questionCount: 3, marksPerQuestion: 1 },
    { topicName: "Magnetic Materials", questionCount: 1, marksPerQuestion: 1 },
    { topicName: "Electromagnetic Induction", questionCount: 2, marksPerQuestion: 1 },
    { topicName: "AC Circuits", questionCount: 2, marksPerQuestion: 1 },
    { topicName: "Dual Nature of Radiation and Matter", questionCount: 2, marksPerQuestion: 1 },
    { topicName: "Structure of Atoms and Nuclei", questionCount: 3, marksPerQuestion: 1 },
    { topicName: "Semiconductor Devices", questionCount: 2, marksPerQuestion: 1 }
  ]
};

const physics11Distribution = {
  subject: "Physics",
  standard: 11,
  topics: [
    { topicName: "Error Analysis", questionCount: 1, marksPerQuestion: 1 },
    { topicName: "Vectors", questionCount: 1, marksPerQuestion: 1 },
    { topicName: "Motion in a Plane", questionCount: 1, marksPerQuestion: 1 },
    { topicName: "Laws of Motion", questionCount: 1, marksPerQuestion: 1 },
    { topicName: "Gravitation", questionCount: 1, marksPerQuestion: 1 },
    { topicName: "Thermal Property of Matter", questionCount: 1, marksPerQuestion: 1 },
    { topicName: "Sound", questionCount: 1, marksPerQuestion: 1 },
    { topicName: "Optics", questionCount: 1, marksPerQuestion: 1 },
    { topicName: "Electrostatics", questionCount: 1, marksPerQuestion: 1 },
    { topicName: "Semiconductors", questionCount: 1, marksPerQuestion: 1 },
    { topicName: "measures of dispersion", questionCount: 1, marksPerQuestion: 1 }
  ]
};

const mathsDistribution = {
  subject: "Mathematics",
  standard: 12,
  topics: [
    { topicName: "Mathematics Logic", questionCount: 2, marksPerQuestion: 2 },
    { topicName: "Matrics", questionCount: 2, marksPerQuestion: 2 },
    { topicName: "Trigonometric Functions", questionCount: 3, marksPerQuestion: 2 },
    { topicName: "Pair of Straight Lines", questionCount: 2, marksPerQuestion: 2 },
    { topicName: "Vectors", questionCount: 4, marksPerQuestion: 2 },
    { topicName: "Line and Plane", questionCount: 4, marksPerQuestion: 2 },
    { topicName: "Linear Programming", questionCount: 1, marksPerQuestion: 2 },
    { topicName: "Differentiation", questionCount: 4, marksPerQuestion: 2 },
    { topicName: "Applications of Derivatives", questionCount: 3, marksPerQuestion: 2 },
    { topicName: "Indefinite Integration", questionCount: 3, marksPerQuestion: 2 },
    { topicName: "Definite Integration", questionCount: 3, marksPerQuestion: 2 },
    { topicName: "Application of Definite Integration", questionCount: 2, marksPerQuestion: 2 },
    { topicName: "Differential Equations", questionCount: 3, marksPerQuestion: 2 },
    { topicName: "Probability Distributions", questionCount: 2, marksPerQuestion: 2 },
    { topicName: "Binomial Distribution", questionCount: 2, marksPerQuestion: 2 }
  ]
};

const maths11Distribution = {
  subject: "Mathematics",
  standard: 11,
  topics: [
    { topicName: "Trigonometry-2", questionCount: 1, marksPerQuestion: 2 },
    { topicName: "Straight Line", questionCount: 1, marksPerQuestion: 2 },
    { topicName: "Circle", questionCount: 1, marksPerQuestion: 2 },
    { topicName: "Probability", questionCount: 1, marksPerQuestion: 2 },
    { topicName: "Complex Numbers", questionCount: 1, marksPerQuestion: 2 },
    { topicName: "Permutation Combination", questionCount: 1, marksPerQuestion: 2 },
    { topicName: "Functions", questionCount: 1, marksPerQuestion: 2 },
    { topicName: "Limits", questionCount: 1, marksPerQuestion: 2 },
    { topicName: "Continuity", questionCount: 1, marksPerQuestion: 2 },
    { topicName: "Conic Section", questionCount: 1, marksPerQuestion: 2 },
    { topicName: "determinants and matrices", questionCount: 0, marksPerQuestion: 2 },
    { topicName: "sequences and series", questionCount: 0, marksPerQuestion: 2 },
  ]
};

const chemistryDistribution = {
  subject: "Chemistry",
  standard: 12,
  topics: [
    { topicName: "Solid State", questionCount: 3, marksPerQuestion: 1 },
    { topicName: "Solutions", questionCount: 3, marksPerQuestion: 1 },
    { topicName: "Ionic Equilibria", questionCount: 2, marksPerQuestion: 1 },
    { topicName: "Chemical Thermodynamics", questionCount: 3, marksPerQuestion: 1 },
    { topicName: "Electrochemistry", questionCount: 3, marksPerQuestion: 1 },
    { topicName: "Chemical Kinetics", questionCount: 2, marksPerQuestion: 1 },
    { topicName: "Elements of Groups 16, 17 and 18", questionCount: 3, marksPerQuestion: 1 },
    { topicName: "Transition and Inner Transition Elements", questionCount: 2, marksPerQuestion: 1 },
    { topicName: "Coordination Compounds", questionCount: 2, marksPerQuestion: 1 },
    { topicName: "Halogen Derivatives", questionCount: 2, marksPerQuestion: 1 },
    { topicName: "Alcohols, Phenols, and Ethers", questionCount: 3, marksPerQuestion: 1 },
    { topicName: "Aldehydes, Ketones and Carboxylic Acids", questionCount: 3, marksPerQuestion: 1 },
    { topicName: "Amines", questionCount: 3, marksPerQuestion: 1 },
    { topicName: "Biomolecules", questionCount: 2, marksPerQuestion: 1 },
    { topicName: "Introduction to Polymer Chemistry", questionCount: 2, marksPerQuestion: 1 },
    { topicName: "greenchemistry and nanochemistry", questionCount: 2, marksPerQuestion: 1 },
    { topicName: "Metallurgy", questionCount: 0, marksPerQuestion: 1 },
  ]
};

const chemistry11Distribution = {
  subject: "Chemistry",
  standard: 11,
  topics: [
    { topicName: "Some Basic Concepts of Chemistry", questionCount: 1, marksPerQuestion: 1 },
    { topicName: "Structure of Atom", questionCount: 1, marksPerQuestion: 1 },
    { topicName: "Chemical Bonding", questionCount: 1, marksPerQuestion: 1 },
    { topicName: "Redox Reactions", questionCount: 1, marksPerQuestion: 1 },
    { topicName: "Elements of Group 1 and 2", questionCount: 1, marksPerQuestion: 1 },
    { topicName: "States of Matter", questionCount: 1, marksPerQuestion: 1 },
    // { topicName: "Adsorption and Colloids", questionCount: 1, marksPerQuestion: 1 },
    { topicName: "Basic Principles of Organic Chemistry", questionCount: 1, marksPerQuestion: 1 },
    { topicName: "Hydrocarbons", questionCount: 1, marksPerQuestion: 1 },
    { topicName: "Chemistry in Everyday Life", questionCount: 1, marksPerQuestion: 1 },
    { topicName: "Surface Chemistry", questionCount: 0, marksPerQuestion: 1 },
    { topicName: "Hydrogen", questionCount: 1, marksPerQuestion: 1 },
  ]
};

async function setupCETDistribution() {
  try {
    await mongoose.connect(process.env.MONGO_URI!);
    logger.info("Connected to MongoDB");

    // Create domains if they don't exist
    const domains = {
      juniorCollege: await Domain.findOneAndUpdate(
        { domainName: "juniorCollege" },
        { domainName: "juniorCollege", educationLevel: "juniorCollege" },
        { upsert: true, new: true }
      )
    };

    // Create subjects if they don't exist
    const subjects = {
      physics: await Subject.findOneAndUpdate(
        { subjectName: "physics" },
        { subjectName: "physics", domainId: domains.juniorCollege._id },
        { upsert: true, new: true }
      ),
      chemistry: await Subject.findOneAndUpdate(
        { subjectName: "chemistry" },
        { subjectName: "chemistry", domainId: domains.juniorCollege._id },
        { upsert: true, new: true }
      ),
      mathematics: await Subject.findOneAndUpdate(
        { subjectName: "mathematics" },
        { subjectName: "mathematics", domainId: domains.juniorCollege._id },
        { upsert: true, new: true }
      )
    };

    // Create topics and update distribution with topic IDs
    const updatedDistributions = [];
    
    for (const dist of [chemistryDistribution, chemistry11Distribution, 
                       physicsDistribution, physics11Distribution,
                       mathsDistribution, maths11Distribution]) {
      const subjectName = dist.subject.toLowerCase();
      const subjectId = subjects[subjectName as keyof typeof subjects]._id;
      
      const topicsWithIds = await Promise.all(
        dist.topics.map(async (topic) => {
          const topicDoc = await Topic.findOneAndUpdate(
            { 
              topicName: topic.topicName.toLowerCase(),
              subjectId: subjectId
            },
            { 
              topicName: topic.topicName.toLowerCase(),
              subjectId: subjectId
            },
            { upsert: true, new: true }
          );

          return {
            ...topic,
            topicId: topicDoc._id,
            topicName: topic.topicName.toLowerCase()
          };
        })
      );

      updatedDistributions.push({
        ...dist,
        topics: topicsWithIds
      });
    }

    // Clear and create new CET distribution
    await CETDistribution.deleteMany({});
    await CETDistribution.create({
      distributions: updatedDistributions
    });

    logger.info("CET distribution setup completed successfully");
  } catch (error) {
    logger.error("Error in CET distribution setup:", error);
    throw error;
  } finally {
    await mongoose.disconnect();
  }
}

setupCETDistribution();