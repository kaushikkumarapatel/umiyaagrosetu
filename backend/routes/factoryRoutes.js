const express = require("express");
const router = express.Router();
const pool = require("../db");

router.get("/factories", async (req,res)=>{

try{

const result = await pool.query(
"SELECT id,name FROM factories WHERE is_active=true ORDER BY name"
);

res.json(result.rows);

}catch(err){

console.error(err);
res.status(500).json({error:"Failed to load factories"});

}

});

module.exports = router;