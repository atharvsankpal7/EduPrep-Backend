import mongoose from "mongoose";

const connectTOMongoDB = async () => {
  const connection = await mongoose.connect(`${process.env.MONGO_URI}`);
  if (!connection) {
    throw new Error("database connection error: failed to connect to mongodb");
  }
  console.log(`Connected to the mongodb, HOST: ${connection.connection.host}://${connection.connection.port}`);
};

export default connectTOMongoDB;
