const express = require("express");
const router = express.Router();
const broadcastService = require("../services/broadcastService");

/*
Send WhatsApp Broadcast
*/
router.get("/send-broadcast", async (req, res) => {

   await broadcastService.sendLatestBroadcast();

   res.send("Broadcast triggered");

});

router.get("/test-broadcast", (req,res)=>{
res.send("broadcast route working");
});
/*
Generate Today's Market Message
*/
router.get("/today-message", async (req, res) => {

   try {

      const message = await broadcastService.generateTodayMessage();

      res.json({
         message : message
      });

   } catch(err){

      console.error(err);
      res.status(500).send("Error generating message");

   }

});

module.exports = router;