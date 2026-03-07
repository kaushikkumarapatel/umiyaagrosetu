const cron = require("node-cron");
const broadcastService = require("./services/broadcastService");

cron.schedule("30 9 * * *", async () => {

   console.log("Running Morning Broadcast");

   await broadcastService.sendLatestBroadcast();

});