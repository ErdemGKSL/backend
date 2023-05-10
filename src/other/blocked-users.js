const axios = require("axios").default;

let blockedUsers = {};

async function update() {
  try {
    let req = await axios.get("https://raw.githubusercontent.com/acord-standalone/assets/main/data/blocked-users.json", { responseType: "json" });
    blockedUsers = req.data;
  } catch (err) {
    console.log("Unable to update blocked users list.");
  }
}

setInterval(update, 60000 * 60);
update();

function getUserBlockReason(userId) {
  return blockedUsers[userId];
}

module.exports = {
  getUserBlockReason
}