const classes = require('./classes')
const party = require('./party')
const partyName = 'Baker Street Bakers'   // todo: make this selectable
let discordServer

const loginToken = "NzU4NTcyNzgwMjkwOTY1NTUy.GO4gCK.FwzEg__DM0d5RccnsWu5UBgCffNuSRTKOMvNvg"
let discordServerName
if (process.argv.length >= 3) {
    discordServerName = process.argv[2]
} else {
    discordServerName = "HalfAstral Plane"
}

const { Client, GatewayIntentBits } = require('discord.js')
const fetchAll = require('discord-fetch-all')

const client = new Client({
	intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildMessageReactions,
    GatewayIntentBits.GuildPresences,
    GatewayIntentBits.MessageContent
]})

function getGamedayChannel() {
  const today = new Date()
  const yyyy = today.getFullYear()
  const mm = today.getMonth() + 1
  const dd = today.getDate()
  const gameDay = mm + '-' + dd + '-' + yyyy
  return discordServer.channels.cache.find(channel => channel.name.includes(gameDay))
}

function notifyOutputChannel(channel) {
  console.log("Setting output channel: " + channel.name)
//  channel.send("# DragonBone will operate here.")
}

function getOutputChannel() {
  discordServer = client.guilds.cache.find(guild => guild.name === discordServerName)
  let channel = discordServer.channels.cache.find(channel => (channel.name.startsWith("party")))
  if (!channel) {
    channel = getGamedayChannel();
  }
  if (channel) {
    notifyOutputChannel(channel)
  } else {
    console.log("Could not find party channel\nI will watch for one, or you can type \"!dbone\" in the channel you want me to use.")
  }
  return channel
}

function formatPartyLevels(party) {
  const line = party.name.length + 15
  let st = `\`\`\`\n${party.name}, XP: ${party.xp}\n${'-'.repeat(line)}\n`
  let maxName = 9
  let maxClass = 5
  const maxLevel = 5
  const gutter = 3
  const indent = 2
  party.members.forEach((member) => {   // get max lengths of fields
    maxName = Math.max(maxName, member.name.length)
    maxClass = Math.max(maxClass, member.class.length)
  })
  
  st += 'Character' + ' '.repeat(maxName - 9 + indent + gutter)    // headings
  + 'Class' + ' '.repeat(maxClass - 5 + gutter)
  + 'Level' + ' '.repeat(maxLevel - 5 + gutter)
  + 'Xp to Next\n'
  + '-'.repeat(9 + indent) + ' '.repeat(maxName - 9 + gutter)
  + '-'.repeat(5) + ' '.repeat(maxClass - 5 + gutter)
  + '-'.repeat(5) + ' '.repeat(maxLevel - 5 + gutter)
  + '-'.repeat(10) + '\n'
  
  party.members.forEach((member) => {     
    st += ((member.boss) ? ' '.repeat(indent) : '')
      + member.name + ' '.repeat(maxName - member.name.length + gutter) + ((member.boss) ? '' : ' '.repeat(indent))
      + member.class + ' '.repeat(maxClass - member.class.length + gutter)
      + member.level + ' '.repeat(maxLevel - member.level.length + gutter) 
      + member.xpToNext + '\n'
  })
  st += "\`\`\`"
  return st
}

function showPartyLevels(channel) {
  console.log(`Get party levels for ${partyName}`)
  const pty = party.getParty(partyName)
  const json = party.getPartyLevels(pty, 0)   // get levels for stored party xp
  const partyInfo = formatPartyLevels(json)
  channel.send(partyInfo)
}

function addPartyXp(channel, xpToAdd) {
  console.log(`Add ${xpToAdd} xp to ${partyName}`)
  const pty = party.getParty(partyName)
  party.addPartyXp(pty, xpToAdd)
  
  showPartyLevels(channel)
}

client.once('ready', () => {
  console.log('DragonBone emulator connected to Discord server ' + discordServerName)
  outputChannel = getOutputChannel()
})

// handle discord commands
client.on('messageCreate', message => {
//  console.log(client.user)
//  console.log(message)

  if (message.content.startsWith("!db")) {     // !dbone - tell dragonbone to use the current channel to roll dice
    outputChannel = message.channel
    console.log("Received db command")
    notifyOutputChannel(outputChannel)
    message.delete()
  } else if (message.content.startsWith("!party xp")) {  // add xp to party
    const param = message.content.substring(10)
    console.log(isNaN(param))
    if (isNaN(param)) return
    const xpToAdd = parseInt(param)
    addPartyXp(message.channel, xpToAdd)
    showPartyLevels(message.channel)
    message.delete()
} else if (message.content == "!party") {  // show party levels
      showPartyLevels(message.channel)
      message.delete()
  }
})

// if the dice channel gets deleted look for a new one
client.on('channelDelete', channel => {
  if (channel.name == outputChannel.name) {
    console.log("\nChannel " + channel.name + " deleted.")
    outputChannel = getOutputChannel()
  }
})
  
client.on('channelCreate', channel => {
  outputChannel = getOutputChannel()
})

client.login(loginToken)    // login to discord

// create an http server to receive requests from DragonBone
const HTTP_PORT = 8090
const http = require('http')
const { userInfo, loadavg } = require('os')

const requestListener = function (req, res) {
  res.writeHead(200)
  res.end('Hey, D-Bone!')
  let url = req.url.toString()
  if (url.includes("/roll/")) {
    const args = req.url.split('/')
    const result = args[args.length - 1]
    if (outputChannel) {
      console.log("Sending '" + result + "' to " + outputChannel.name)
      outputChannel.send("DragonBone rolled d20: " + result)
    } else {
      console.log("No current output channel.")
    }
  } else if (url.includes("/map/")) {

  }
}

const server = http.createServer(requestListener)
server.listen(HTTP_PORT)
