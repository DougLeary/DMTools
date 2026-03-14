// botConfig.js - use a Discord channel to store bot config info.
// A discord server should have a private channel named "<botname>-config" that contains a message like: 
//   { “config”: { “item-name”: “item-value”,... }}
// Items should include "system": "name-of-a-game-system", "party": "name-of-a-party"
// For now that's it - system and party info are still in local files classes.json and party.json
// but the next step is to move system and party data to the config channel.
// Instead of <botname>-config maybe the channel should be "<botname>-data". 
