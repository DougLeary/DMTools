// OSDnD Discord Bot
const secret = require('./secret')
const classes = require('./classes')
const party = require('./party')
const Discord = require('discord.js')
const Bits = Discord.GatewayIntentBits
const fetchAll = require('discord-fetch-all')
const configCache = []
const maxConfigs = 20
//const configCache = require('./recentCache')
//configCache.setup(maxConfigs, (config,guildId) => { return (config.guildId == guildId)})

const botName = "OSDnD"
const configChannelName = "osdnd-config"
const commandRole = "DM"
const defaultPartyName = "Unknown"
let isBotConnected = false

const client = new Discord.Client({
	intents: [
    Bits.Guilds,
    Bits.GuildMembers,
    Bits.GuildMessages,
    Bits.GuildMessageReactions,
    Bits.GuildPresences,
    Bits.MessageContent
]})

// promise example
function doStuff(arg) {
  // do an asynchronous task like getting something from Discord
	return new Promise((resolve, reject) => {
		if (arg > 10) {
      return reject("Aww crap!")      // the reject value could also be a function that returns a value 
    } 
	  resolve("Woo-hoo!");    // the resolve value could also be a function that returns a value
	})
}

// usage example; calling doStuff returns a Promise object
// 
doStuff(5)
	.then((successValue) => {
		console.log(`doStuff succeeded with result "${successValue}"`)
	})
	.catch((failuireValue) => {
    console.log(`doStuff failed with "${failureValue}"`)
	})

function getConfig(guildId) {
  const config = configCache.get(guildId)
  if (config) {
    console.log("so yes, we have config")
    return config
  } else {
    console.log("so try to get config from discord")
    // get the most recent message in the config channel
    const senderGuild = client.guilds.cache.get(guildId);
    let configChannel
    if (senderGuild) {
      configChannel = senderGuild.channels.cache.find(channel => channel.name == configChannelName)
      if (configChannel) {
        console.log(`Found config channel ${configChannel.name}`)
      } else {
        console.log(`Cannot find config channel`)
      }
    }
 
    if (!configChannel) return { error: "No config available" } 

    console.log("reading config channel")

    // get config message
    fetchAll.messages(configChannel, {
      reverseArray: true,
      userOnly: false,
      botOnly: false,
      pinnedOnly: false,
    }).then(
      (messages) => {
        console.log("Found",messages.length," messages")
        let config = null
        try {
          const msg = messages[messages.length-1];
          config = JSON.parse(msg.content)

          if (config.isConfig) {
            if (!config.guildId) {
              // no guildId present; fill it in and write updated config to Discord
              config.guildId = msg.guildId
              console.dir(config)
              msg.delete()
              console.log("writing new config msg")
              msg.channel.send(JSON.stringify(config))
              configCache.touch(config, (a, b) => { return (a.guildId == b.guildId)})
            }
          }
          console.dir(config)
        } catch(error) {
        } finally {
          return config
        }
      },
      () => {
        console.log(" error: No config available")
      }
    )
  }
}

function scrubChannel(channel) {
  // delete extra messages from the channel, leaving only the most recent
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

function formatPartyLevels(party) {
  // Discord markdown does not support table formatting,
  // but it displays ```text``` in monospace font, preserving blanks and line breaks,
  // which makes it possible to send it preformatted tables.
  const line = party.name.length + 15
  let maxName = 9     // length of longest character name in the party
  let maxClass = 5    // length of longest class name
  const maxLevel = 5  // length of longest level text
  const gutter = 3    // gap between columns
  const indent = 2    // left indent for entire result

  const st = []       // array for text fragments composing the result
  st.push("\`\`\`")   // make Discord display text as-is
  st.push(`${party.name}, XP: ${party.xp}\n${'-'.repeat(line)}\n`)
  
  party.members.forEach((member) => {   // scan party list for max field sizes
//    console.dir(member)
    maxName = Math.max(maxName, member.name.length)
    maxClass = Math.max(maxClass, member.classes.length)
  })
  
  // column headings and underlines
  st.push('Character' + ' '.repeat(maxName - 9 + indent + gutter))
  st.push('Class' + ' '.repeat(maxClass - 5 + gutter))
  st.push('Level' + ' '.repeat(maxLevel - 5 + gutter))
  st.push('XP to Next Level\n')
  st.push('-'.repeat(9 + indent) + ' '.repeat(maxName - 9 + gutter))
  st.push('-'.repeat(5) + ' '.repeat(maxClass - 5 + gutter))
  st.push('-'.repeat(5) + ' '.repeat(maxLevel - 5 + gutter))
  st.push('-'.repeat(16) + '\n')
  
  party.members.forEach((member) => {     
    st.push((member.boss) ? ' '.repeat(indent) : '')
    st.push(member.name + ' '.repeat(maxName - member.name.length + gutter) + ((member.boss) ? '' : ' '.repeat(indent)))
    st.push(member.classes + ' '.repeat(maxClass - member.classes.length + gutter))
    st.push(member.levels + ' '.repeat(maxLevel - member.levels.length + gutter))
    st.push(member.xpToNext + '\n')
  })
  st.push("\`\`\`")
  return st.join('')
}

function showPartyLevels(channel, config) {
  console.log(`showPartyLevels`)
  const partyName = config.partyName || defaultPartyName
  console.log(`Get party levels for ${partyName}`)
  const pty = party.getParty(partyName)
  const json = party.getPartyLevels(pty, 0)   // get levels for stored party xp
  const partyInfo = formatPartyLevels(json)
  channel.send(partyInfo)
}

function addPartyXp(channel, config, xpToAdd) {
  const partyName = config.partyName || defaultPartyName
  console.log(`Add ${xpToAdd} xp to ${partyName}`)
  const pty = party.getParty(partyName)
  party.updateXp(party.Actions.add, pty, xpToAdd)
  
  showPartyLevels(channel, config)
}

// handle discord commands; if the command is executed the command message is deleted from discord
client.on('messageCreate', message => {
  // console.log(client.user)
  // console.log(message)

  console.log("Call getConfig from message handler")
  const config = getConfig(message.guildId, onSuccess, onFail)

  if (message.content.startsWith("!party xp")) {  // add xp to party
    if (!message.member.roles.cache.find(role => role.name === commandRole)) {
      message.channel.send(`Command requires the "${commandRole}" role.`)
      return
    }
    const param = message.content.substring(10)
    if (isNaN(param)) return
    const xpToAdd = parseInt(param)
    addPartyXp(message.channel, xpToAdd)
    message.delete()
  } else if (message.content == "!party") {  // show party levels
    showPartyLevels(message.channel, config)
    message.delete()
  } else if (message.content =="!test") {
    const senderGuild = client.guilds.cache.get(message.guildId);
    const status = {    
      configChannel: configChannelName,
      capacity: configCache.capacity,
      length: configCache.length
    }
    console.dir(status)
  }
})

client.once('ready', () => {
  console.log(`${botName} connected to Discord`)
})

function start() {
  async function login() {
      try {
        const returnedToken = await client.login(secret.loginToken)
        isRunning = true
      } catch (error) {
        isRunning = false
      }
    }
    login()

  // // non-async version
  // client.login(secret.loginToken)
  //   .then((returnedToken) => {
  //     isBotConnected = true
  //   })
  //   .catch(error) {
  //     isBotConnected = false
  //   }
}

function stop() {
  async function shutdown() {
    await client.destroy()
    isBotConnected = false
  }

  // // Using .then()
  // function shutdownWithThen() {
  //   console.log('Shutting down...')
  //   client.destroy().then(() => { // The callback receives no value
  //     isBotConnected = false
  //   })
  // }
}

function isRunning() {
  return isBotConnected
}

module.exports = {
  start,
  stop,
  isRunning,
  showPartyInfo
}