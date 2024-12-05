import { app } from "./app";
import dotenv from "dotenv";
import connectTOMongoDB from "./db";
dotenv.config({
  path: "./.env",
});

connectTOMongoDB().then(()=>{
  app.listen(process.env.PORT|| 5000, )
}).catch((err:Error)=>{
  console.log("MongoDB connection failed", err)
})