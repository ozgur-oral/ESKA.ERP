import type { Request, Response } from "express";
import { findPublicUserById, loginUser } from "../auth/service.js";
export async function login(req:Request,res:Response){const identifier=typeof req.body?.identifier==="string"?req.body.identifier:"",password=typeof req.body?.password==="string"?req.body.password:"";if(!identifier||!password){res.status(400).json({success:false,message:"Kullanıcı adı/e-posta ve şifre zorunludur."});return}const result=await loginUser(identifier,password);if(!result){res.status(401).json({success:false,message:"Kullanıcı bilgileri hatalı."});return}res.json({success:true,message:"Giriş başarılı.",data:result})}
export async function me(req:Request,res:Response){const user=req.auth?await findPublicUserById(req.auth.userId):null;if(!user){res.status(401).json({success:false,message:"Oturum bulunamadı."});return}res.json({success:true,data:user})}
export function logout(_req:Request,res:Response){res.json({success:true,message:"Oturum kapatıldı."})}
