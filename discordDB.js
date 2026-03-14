// discordDB.js - use a discord channel as a database;
// read JSON config data from a channel or write it as a new message 

const fetchAll = require('discord-fetch-all')

function getConfig(channel) {
  // get all messages in the channel in reverse order
  console.log("getConfig")
  fetchAll.messages(channel, {
    reverseArray: true,
    userOnly: false,
    botOnly: false,
    pinnedOnly: false,
  }).then(
    (messages) => {
      console.log("Found",messages.length," messages")
      try {
        const msg = messages[messages.length-1];
        console.log(`msg: ${msg.content}`)
        const config = JSON.parse(msg.content)
        console.log(`config: ${config}`)
        return config
      } catch(error) {
        return { error: error}
      }
    },
    () => {
      return { error: "No config available" }
    }
  )
}

function scrubChannel(channel) {
  // delete extra JSON objects from the channel, leaving only the most recent
  fetchAll.messages(channel, {
    reverseArray: true, // Reverse the returned array
    userOnly: false, // Only return messages by users
    botOnly: false, // Only return messages by bots
    pinnedOnly: false, // Only returned pinned messages
  }).then(
    (messages) => {
      console.log("Found",messages.length," messages")
      var nDeleted = 0
      for (msg of messages) {
        if (shouldScrubAuthor(msg.author.username)
          || shouldScrubText(msg.content.replace(/\d+/g, ''))) {
          msg.delete()
          nDeleted++
        }
      }
      console.log(`Deleted ${nDeleted} roll-related messages.`)
    },
    () => {
      console.log("No messages available")
    }
  )
}

module.exports = {
  getConfig,
  scrubChannel
}
