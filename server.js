
import express from "express";
import pg from "pg";
import cors from "cors";

const app = express();
app.use(cors());
app.use(express.json());

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

function generateCode(){
  return Math.floor(100000 + Math.random()*900000).toString();
}

app.post("/api/vendors/register", async (req,res)=>{
  const {firstName,lastName,email,phone} = req.body;
  if(!email.endsWith("@gmail.com")){
    return res.status(400).json({error:"Gmail requis"});
  }
  const code = generateCode();
  const expires = new Date(Date.now()+10*60*1000);
  await pool.query(
    `INSERT INTO vendors(first_name,last_name,email,phone,verification_code,code_expires_at)
     VALUES($1,$2,$3,$4,$5,$6)
     ON CONFLICT(email) DO UPDATE SET verification_code=$5, code_expires_at=$6`,
    [firstName,lastName,email,phone,code,expires]
  );
  console.log("OTP VENDEUR:", code);
  res.json({message:"Code envoyé"});
});

app.post("/api/vendors/verify", async (req,res)=>{
  const {email,code} = req.body;
  const r = await pool.query("SELECT * FROM vendors WHERE email=$1",[email]);
  if(!r.rows.length) return res.status(404).json({error:"Introuvable"});
  const v = r.rows[0];
  if(v.verification_code!==code) return res.status(400).json({error:"Code invalide"});
  if(new Date()>v.code_expires_at) return res.status(400).json({error:"Code expiré"});
  await pool.query("UPDATE vendors SET is_verified=true, verification_code=NULL, code_expires_at=NULL WHERE email=$1",[email]);
  res.json({message:"Compte validé"});
});

app.listen(process.env.PORT||3000,()=>console.log("API ready"));
