// OSDnD Discord Bot
const classes = require('./classes')
const party = require('./party')
const partyName = 'Baker Street Bakers'   // todo: make this selectable

const loginToken = "MTIzODAxNDEyNDQ1ODUxMjM5Ng.GkMAEe.tDp2qdLdLr3Bg6XcrNorECGq7g_wQS2QDViv2Q" 

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
  console.log('DragonBone emulator connected to Discord server')
})

// handle discord commands
client.on('messageCreate', message => {
//  console.log(client.user)
//  console.log(message)

  if (message.content.startsWith("!party xp")) {  // add xp to party
    const param = message.content.substring(10)
    if (isNaN(param)) return
    const xpToAdd = parseInt(param)
    addPartyXp(message.channel, xpToAdd)
    message.delete()
} else if (message.content == "!party") {  // show party levels
      showPartyLevels(message.channel)
      message.delete()
  }
})

client.login(loginToken)    // login to discord
