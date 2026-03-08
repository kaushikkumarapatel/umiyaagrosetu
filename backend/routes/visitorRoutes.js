const express = require("express");
const router = express.Router();
const pool = require("../db");

/* Log visitor */

router.post("/visitor", async (req,res)=>{

try{

const {ip,city,region,country,page,device} = req.body;

await pool.query(
`
INSERT INTO visitor_logs
(ip_address, city, region, country, device, page)
VALUES ($1,$2,$3,$4,$5,$6)
`,
[ip,city,region,country,device,page]
);

res.json({status:"ok"});

}catch(err){

console.error(err);
res.status(500).json({error:"visitor log failed"});

}

});

module.exports = router;