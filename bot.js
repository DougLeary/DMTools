// OSDnD Discord Bot
const secret = require('./secret')
const classes = require('./classes')
const party = require('./party')
//const partyName = 'Baker Street Bakers'   // todo: make this selectable
const partyName = 'Arden Vooligans'


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
  const line = party.name.length + 30
  let st = `\`\`\`\n${party.name}, XP: ${party.xp} (+10% = ${Math.floor(party.xp * 1.1)})\n${'-'.repeat(line)}\n`
  let maxName = 9       // layout values for monospace column positions 
  let maxClass = 5
  const maxLevel = 5
  const gutter = 3
  const indent = 2
  party.members.forEach((member) => {   // get max lengths of fields
    //console.dir(member)
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

function isDeletable(msg) {
  // content filter
  return (msg.content.startsWith("!party") 
    || msg.content.startsWith("!scrub")
    || msg.content.startsWith("!test")
  )
}

async function scrubChannel(channel, criteriaFn) {
  // delete messages up to 14 days old that meet the criteria, in batches of 100
  console.log("Scrub Channel")
  if (!channel) throw new Error("scrubMessages requires a valid channel.")

  let lastMessageId = null
  // 2-week-old threshold for deletable messages (Discord rule; msgs older than 14 days cannot be bulk deleted)
  const fortnightAgo = Date.now() - 14 * 24 * 60 * 60 * 1000

  while (true) {
    const options = { limit: 100 }

    // If this is not the first batch, start where we left off
    if (lastMessageId) {
      options.before = lastMessageId
    }

    const batch = await channel.messages.fetch(options)
    if (batch.size === 0) break

    lastMessageId = batch.lastKey()

    // Filter the batch to only the messages we want to delete
    const toDelete = batch.filter(criteriaFn)
    if (toDelete.size === 0) continue

    // Filter to only recent messages and bulk delete those
    const youngMessages = toDelete.filter(msg => msg.createdTimestamp > fortnightAgo)
    if (youngMessages.size > 0) {
      await channel.bulkDelete(youngMessages, true)
        .catch(err => console.error("scrubMessages - bulk delete error:", err))
    }
  }
}

function showPartyLevels(channel) {
  console.log(`Show party levels for ${partyName}`)
  const pty = party.getParty(partyName)
  const json = party.getPartyLevels(pty, 0)
  const result = formatPartyLevels(json)
  console.log(`--- Sending discord msg:\n${json.name}, ${json.members[0].name}\nformatted:\n   ${result}`)
  try {
    channel.send(result)
    console.log("Message sent to Discord")
  } catch(err) {
    console.log(`Error sending message ${result.substring(0,4)}... \nError: ${err.message}`)
  }
}

function addPartyXp(channel, xpToAdd) {
  console.log(`Add ${xpToAdd} xp to each member of ${partyName}`)
  const pty = party.getParty(partyName)
  party.updateXp(party.Actions.add, xpToAdd, pty)
}

client.once('ready', () => {
  console.log('OSDnD bot connected to Discord')
})

// handle discord commands
client.on('messageCreate', message => {
//  console.log(client.user)
//  console.log(message)

  // tokenize and parse command
  if (message.content.startsWith('!')) {
    console.log(`-- Handling ${message.content}`)
    const tokens = message.content.trim().split(' ')
    const cmd = tokens[0].toLowerCase()
    if (cmd == "!party") {
      if (tokens[1] == "xp") {
        const xp = !isNaN(tokens[3]) ? parseInt(tokens[3]) : 0
        if (xp == 0) return
        if (tokens[2] == "set") {
          // setting party xp to a flat number not implemented; until then manually set all member xp to 0 and use !party xp add 
        } else if (tokens[2] == "add") {
          addPartyXp(message.channel, xp)
        }
        showPartyLevels(message.channel)
      } else {    // show party levels
        showPartyLevels(message.channel)
      }
      // try {
      //   message.delete()
      //   console.log(`Command ${cmd} deleted.`)
      // } catch(err) {
      //   console.log(`Error trying to delete message ${cmd}; Error:\n${err.message}`)
      // }
    } else if (cmd == "!scrub") {
        scrubChannel(message.channel, isDeletable);
        message.delete();
    }
  }
})

//client.on('disconnect',)
client.login(secret.loginToken)
