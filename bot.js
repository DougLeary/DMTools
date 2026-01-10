// OSDnD Discord Bot
const secret = require('./secret')
const classes = require('./classes')
const party = require('./party')
const partyName = 'Baker Street Bakers'   // todo: make this selectable


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
  let maxName = 9       // layout values for monospace column positions 
  let maxClass = 5
  const maxLevel = 5
  const gutter = 3
  const indent = 2
  party.members.forEach((member) => {   // get max lengths of fields
    console.dir(member)
    maxName = Math.max(maxName, member.name.length)
    maxClass = Math.max(maxClass, member.classes.length)
  })
  
  st += 'Character' + ' '.repeat(maxName - 9 + indent + gutter)    // headings
  + 'Class' + ' '.repeat(maxClass - 5 + gutter)
  + 'Level' + ' '.repeat(maxLevel - 5 + gutter)
  + 'XP to Next Level\n'
  + '-'.repeat(9 + indent) + ' '.repeat(maxName - 9 + gutter)     // heading underlines
  + '-'.repeat(5) + ' '.repeat(maxClass - 5 + gutter)
  + '-'.repeat(5) + ' '.repeat(maxLevel - 5 + gutter)
  + '-'.repeat(16) + '\n'
  
  party.members.forEach((member) => {     
    st += ((member.boss) ? ' '.repeat(indent) : '')
      + member.name + ' '.repeat(maxName - member.name.length + gutter) + ((member.boss) ? '' : ' '.repeat(indent))
      + member.classes + ' '.repeat(maxClass - member.classes.length + gutter)
      + member.levels + ' '.repeat(maxLevel - member.levels.length + gutter) 
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
  party.updateXp(party.Actions.add, pty, xpToAdd)
  
  showPartyLevels(channel)
}

client.once('ready', () => {
  console.log('OSDnD bot connected to Discord')
})

// handle discord commands
client.on('messageCreate', message => {
//  console.log(client.user)
//  console.log(message)

  if (message.content.startsWith("!party xp")) {  // add xp to party
    if (!message.member.roles.cache.find(role => role.name === 'DM')) {
      message.channel.send("Command requires DM role.")
      return
    }
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

client.login(secret.loginToken)
