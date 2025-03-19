import { app } from "./app";
import dotenv from "dotenv";
import connectTOMongoDB from "./db";

dotenv.config({
  path: "./.env",
});
const port = process.env.PORT || 5000;
connectTOMongoDB()
  .then(() => {
    app.listen(port);
    console.log("Server is running on port: ", port);
    console.log("MongoDB is connected ");
  })
  .catch((err: Error) => {
    console.log("Error connecting to MongoDB:", err);
  });
