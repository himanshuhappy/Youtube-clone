import { User } from "../models/user.model.js";
import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import jwt from "jsonwebtoken"


export const verifyJWT= asyncHandler(async(req,_,next)=>{
    try{
     console.log("MIDDLEWARE HIT");
     const authHeader = req.header("Authorization"); 
    const token=req.cookies?.accessToken || authHeader?.replace("Bearer ", "");

    console.log("AUTH HEADER:", authHeader);
    console.log("TOKEN:", token);

    if(!token){
        throw new ApiError(401,"Unauthorized request")
    }
    
    console.log("AUTH HEADER:", req.header("Authorization"));


    const decodedToken = jwt.verify(token,process.env.ACCESS_TOKEN_SECRET)
    const user = await User.findById(decodedToken?._id).select("-password -refreshToken")

    if(!user){
        throw new ApiError(401,"Invalid Access Token")
    }

    req.user=user;
    next()
    }catch(error){
        throw new ApiError(401,error?.message || "Invalid access token")
    }
})