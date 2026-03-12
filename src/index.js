import dotenv from "dotenv"
import connectDB from "./db/index.js";
import mongoose from "mongoose";
import { DB_NAME } from "./constants.js";

dotenv.config({
    path:'./env'
})

connectDB()




//1st APPROCH
/*
import express from "express"
const app=express()

//ife
(
    async()=>{
        try{
        await mongoose.connect(`${process.env.MONGODB_URI}/${DB_NAME}`)
        //when app not able to listen
        app.on("error",(error)=>{
            console.log("ERROR",error);
            throw error
        })
        //when app able to listen
        app.listen(process.env.PORT,()=>{
            console.log(`App os listening on port ${process.env.PORT}`);
        })
        }catch(error){
            console.error("ERROR: ",error)
            throw err
        }
})()
*/
