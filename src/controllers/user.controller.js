import { asyncHandler } from "../utils/asyncHandler.js";
import {ApiError} from "../utils/ApiError.js"
import {User} from "../models/user.model.js"
import {uploadOnCloudinary} from "../utils/cloudinary.js"
import { ApiResponse } from "../utils/ApiResponse.js";
import { generateAccessAndRefreshTokens } from "../models/user.model.js"
import jwt from "jsonwebtoken"

const registerUser=asyncHandler(async(req,res)=>{
        //get user detail from frontend/postman
        const {fullName,email,username,password}=req.body
        console.log("email:",email);
        //validation
        if(
            [fullName,email,username,password].some((field)=>field?.trim()==="")
        ){
            throw new ApiError(400,"All fields are required")
        }
        //check if user already exists
        const existedUser=await User.findOne({
            $or: [{username},{email}]
        })
        if(existedUser){
            throw new ApiError(409,"User with email or username already exists")
        }
        //console.log(req.files);
        //check for avatar,image
        const avatarLocalPath= req.files?.avatar?.[0]?.path;
        const coverImageLocalPath= req.files?.coverImage?.[0]?.path;
        if(!avatarLocalPath){
            throw new ApiError(400,"Avatar file is required")
        }
        //upload avatar,images to cloudinary
        const avatar= await uploadOnCloudinary(avatarLocalPath)
        const coverImage=await uploadOnCloudinary(coverImageLocalPath)
        if(!avatar){
            throw new ApiError(400,"Avatar file is required")
        }
        //create user object
        const user=await User.create({
            fullName,
            avatar:avatar.url,
            coverImage: coverImage?.url||"",
            email,
            password,
            username: username.toLowerCase()
        })
        //remove password and refresh token field from response
        const createdUser=await User.findById(user._id).select(
            "-password -refreshToken"
        )
        //check for user creation
        if(!createdUser){
            throw new ApiError(500,"Something went wrong while registering a user")
        }
        //return response
        return res.status(201).json(
            new ApiResponse(200,createdUser,"User registered Successfully")
        )

})

const loginUser=asyncHandler(async(req,res)=>{
    //get data
    const{email, username, password}=req.body
    console.log(email);

    if(!username && !email){
        throw new ApiError(400,"username or email is required")
    }
    //find user in db from username and email
    const user = await User.findOne({
        $or: [{username},{email}]
    })
    if(!user){
        throw new ApiError(404,"User does not exist")
    }
    //password check
    const isPasswordValid= await user.isPasswordCorrect(password)
    if(!isPasswordValid){
        throw new ApiError(401,"Invalid user credentials")
    }
    //generate access and refresh tokens
    const {accessToken,refreshToken}=await generateAccessAndRefreshTokens(user._id)
    const loggedInUser=await User.findById(user._id).select("-password -refreshToken")
    
    //send cookies
    const options={
        httpOnly: true,
        secure: true
    }

    return res
    .status(200)
    .cookie("accessToken",accessToken,options)
    .cookie("refreshToken",refreshToken,options)
    .json(
        new ApiResponse(
            200,
            {
                user: loggedInUser,accessToken,refreshToken
            },
            "User logged in successfully"
        )
    )
})

const logoutUser= asyncHandler(async(req,res)=>{
    User.findByIdAndUpdate(
        req.user._id,
        {
            //cookie removed from db
            $set:{
                refreshToken: undefined
            }
        },
        {
            new: true
        }
    )

    const options={
        httpOnly: true,
        secure: true
    }

    return res
    .status(200)
    .clearCookie("accessToken",options)
    .clearCookie("refreshToken",options)
    .json(new ApiResponse(200,{},"User logged Out"))
})

const refreshAccessToken=asyncHandler(async(req,res)=>{
    const incomingRefreshToken=req.cookies.refreshToken || req.body.refreshToken
    if(!incomingRefreshToken){
        throw new ApiError(401,"unauthorized request")
    }
    //decode token
    const decodedToken=jwt.verify(
        incomingRefreshToken,
        process.env.REFRESH_TOKEN_SECRET
    )
    //getting user from id
    const user=await User.findById(decodedToken?._id)
    //sending cookies
    try{
        const options={
        httpOnly: true,
        secure: true
    }

    const{accessToken,NewRefreshToken}=await
    generateAccessAndRefreshTokens(user._id)

    return res
    .status(200)
    .cookie("accessToken",accessToken,options)
    .cookie("refreshToken",NewRefreshToken,options)
    .json(
        new ApiResponse(
            200,
            {accessToken,NewRefreshToken},
            "Access token refreshed"
        )
    )
    }catch(error){
        throw new ApiError(401,error?.message || "Invalid refresh token")
    }

})

const changeCurrentPassword= asyncHandler(async(req,res)=>{
    const {oldPassword,newPassword}=req.body

    const user=await User.findById(req.user?.id)
    const isPasswordCorrect= await user.isPasswordCorrect(oldPassword)

    if(!isPasswordCorrect){
        throw new ApiError(400,"Invalid old password")
    }

    user.password=newPassword
    await user.save({validateBeforeSave: false})

    return res
    .status(200)
    .json(new ApiResponse(200,{},"Password changed successfully"))
})

const getCurrentUser= asyncHandler(async(req, res)=>{
    return res
    .status(200)
    .json(200,req.user,"current user fetched successfully")
})

const updateAccountDetails= asyncHandler(async(req,res)=>{
    const {fullName, email}=req.body
    if(!fullName || !email){
        throw new ApiError(400,"All fields are required")
    }

    const user= await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set: {
                fullName: fullName,
                email: email
            }
        },
        {new: true}
    ).select("-password")

    return res
    .status(200)
    .json(new ApiResponse(200,user,"Account details updated successfully"))
})

const updateUserAvatar = asyncHandler(async(req,res)=>{
    const avatarLocalPath = req.file?.path
    if(!avatarLocalPath){
        throw new ApiError(400,"Avatar file is missing")
    }
    const avatar = await uploadOnCloudinary(avatarLocalPath)
    if(!avatar.url){
        throw new ApiError(400,"Error while uploading on avatar")
    }

    const user=await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set:{
                avatar: avatar.url
            }
        },
        {new: true}
    ).select("-password")

    return res
    .status(200)
    .json(
        new ApiResponse(200,user,"Avatar updated successfully")
    )
})

const updateUserCoverImage = asyncHandler(async(req,res)=>{
    const CoverImageLocalPath = req.file?.path
    if(!CoverImageLocalPath){
        throw new ApiError(400,"Cover Image file is missing")
    }
    const CoverImage = await uploadOnCloudinary(CoverImageLocalPath)
    if(!CoverImage.url){
        throw new ApiError(400,"Error while uploading on CoverImage")
    }

    const user=await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set:{
                coverImage: avatar.url
            }
        },
        {new: true}
    ).select("-password")

    return res
    .status(200)
    .json(
        new ApiResponse(200,user,"Cover image updated successfully")
    )
})

const channel=await User.aggregate([
    {
        $match:{
            username: username?.toLowerCase()
        }
    },

    //to get number of subscribers
    {
        $lookup:{
            from: "subscriptions",
            localField: "_id",
            foreignField: "channel",
            as: "subscribers"
        }
    },
    //to get number of subscribed to
    {
        $lookup:{
            from: "subscriptions",
            localField: "_id",
            foreignField: "subscriber",
            as: "subscribedTo"
        }
    },
    {
        $addFields:{
            subscriberCount: {
                $size: "$subscribers"
            },
            channelsSubscribedToCount:{
                $size: "$sibscribedTo"
            },
            isSubscribed:{
                $cond:{
                    if:{$in: [req.user?._id,"$sibscribers.subscriber"]},
                    then: true,
                    else: false
                }
            }
        }

    },
    {
        $project: {
            fullName: 1,
            username: 1,
            subscriberCount: 1,
            channelsSubscribedToCount: 1,
            isSubscribed: 1,
            avatar: 1,
            coverImage: 1,
            email: 1
        }
    }
])

if(!channel?.length){
    throw new ApiError(404,"channel does not exists")
}
return res
.status(200)
.json(
    new ApiResponse(200,channel[0],"User channel fetched successfully")
)

export{ 
    registerUser,
    loginUser,
    logoutUser,
    refreshAccessToken,
    changeCurrentPassword,
    getCurrentUser,
    updateAccountDetails,
    updateUserAvatar,
    updateUserCoverImage,
    channel

}