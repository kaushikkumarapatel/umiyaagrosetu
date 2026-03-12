const express = require("express");
const router = express.Router();
const db = require("../db");

/* ADMIN LOGIN */

router.post("/login", (req, res) => {

  const { password } = req.body;

  if (!process.env.ADMIN_PASSWORD) {
    return res.status(500).json({ error: "ADMIN_PASSWORD not configured" });
  }

  if (password !== process.env.ADMIN_PASSWORD) {
    return res.status(401).json({ error: "Invalid password" });
  }

  req.session.isAdmin = true;

  req.session.save(err => {
    if (err) return res.status(500).json({ error: "Session failed" });

    res.json({ success: true });
  });

});


/* CHECK ADMIN SESSION */

router.get("/check", (req,res)=>{

  if(req.session && req.session.isAdmin){
    return res.json({logged:true})
  }

  res.json({logged:false})

})


/* MASTER DATA */

router.get("/masterdata", async (req,res)=>{

  if(!req.session.isAdmin){
    return res.status(401).json({error:"Unauthorized"})
  }

  try{

    const brokers = await db.query(`
      SELECT id,name,mobile,city,is_active
      FROM brokers
      ORDER BY name
    `)

    const factories = await db.query(`
      SELECT id,name,city,is_active
      FROM factories
      ORDER BY name
    `)

    const commodities = await db.query(`
      SELECT id,name,is_active
      FROM commodities
      ORDER BY name
    `)

    res.json({
      brokers: brokers.rows,
      factories: factories.rows,
      commodities: commodities.rows
    })

  }catch(err){

    console.error(err)
    res.status(500).json({error:"Database error"})

  }

})

module.exports = router;