import mongoose, {Schema} from "mongoose";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import{ ApiError } from "../utils/ApiError.js"
//user model
const userSchema=new Schema({
    username:{
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true,
        index: true
    },
    email:{
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true
    },
    fullName:{
        type: String,
        required: true,
        trim: true,
        index: true
    },
    avatar:{
        type:String, //cloudinary url
        required: true,
    },
    coverImage:{
        type: String, // cloudinary url
    },
    watchHistory:[
        {
            type: Schema.Types.ObjectId,
            ref:"Video"
        }
    ],
    password:{
        type: String,
        required:[true,'Password is required']
    },
    refreshToken: {
        type: String
    }
},{timestamps:true})
//password encryption
userSchema.pre("save",async function (next){
    if(!this.isModified("password")) return;
    this.password=await bcrypt.hash(this.password,10);
})
//password check
userSchema.methods.isPasswordCorrect=async function(password){
    return await bcrypt.compare(password,this.password)
}
//generating access token
userSchema.methods.generateAccessToken=function(){
    return jwt.sign(
        {
        _id: this._id,
        email:this.email,
        username: this.username,
        fullName:this.fullName
        },
        process.env.ACCESS_TOKEN_SECRET,
        {
            expiresIn: process.env.ACCESS_TOKEN_EXPIRY
        }
    )
}
//genrating refresh token
userSchema.methods.generateRefreshToken=function(){
    return jwt.sign(
        {
        _id: this._id,
        },
        process.env.REFRESH_TOKEN_SECRET,
        {
            expiresIn: process.env.REFRESH_TOKEN_EXPIRY
        }
    )
}
//generate tokkens
export const generateAccessAndRefreshTokens=async(userId)=>{
    try{
        const user=await User.findById(userId)
        const accessToken = user.generateAccessToken()
        const refreshToken=user.generateRefreshToken()
        
        //save refresh token in mongoose
        user.refreshToken=refreshToken
        await user.save({validateBeforeSave: false });
        return {accessToken, refreshToken}
    }catch(error){
        throw new ApiError(500,"Something went wrong while generating referesh and access token")
    }
}

export const User=mongoose.model("User",userSchema)