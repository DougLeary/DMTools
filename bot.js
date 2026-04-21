// OSDnD Discord Bot
const secret = require('./secret')
const gameData = require('./gameData')
const party = require('./party')
const partyName = 'Baker Street Bakers' // todo: make this selectable

const { Client, GatewayIntentBits } = require('discord.js')

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildMessageReactions,
    GatewayIntentBits.GuildPresences,
    GatewayIntentBits.MessageContent,
  ],
})

function formatPartyLevels(partyJson) {
  const line = partyJson.name.length + 15
  let st = `\`\`\`\n${partyJson.name}, XP: ${partyJson.xp}\n${'-'.repeat(line)}\n`
  let maxName = 9 // layout values for monospace column positions
  let maxClass = 5
  const maxLevel = 5
  const gutter = 3
  const indent = 2
  partyJson.members.forEach((member) => {
    // get max lengths of fields
    console.dir(member)
    maxName = Math.max(maxName, member.name.length)
    maxClass = Math.max(maxClass, member.classes.length)
  })

  st +=
    'Character' +
    ' '.repeat(maxName - 9 + indent + gutter) + // headings
    'Class' +
    ' '.repeat(maxClass - 5 + gutter) +
    'Level' +
    ' '.repeat(maxLevel - 5 + gutter) +
    'XP to Next Level\n' +
    '-'.repeat(9 + indent) +
    ' '.repeat(maxName - 9 + gutter) + // heading underlines
    '-'.repeat(5) +
    ' '.repeat(maxClass - 5 + gutter) +
    '-'.repeat(5) +
    ' '.repeat(maxLevel - 5 + gutter) +
    '-'.repeat(16) +
    '\n'

  partyJson.members.forEach((member) => {
    st +=
      (member.boss ? ' '.repeat(indent) : '') +
      member.name +
      ' '.repeat(maxName - member.name.length + gutter) +
      (member.boss ? '' : ' '.repeat(indent)) +
      member.classes +
      ' '.repeat(maxClass - member.classes.length + gutter) +
      member.levels +
      ' '.repeat(maxLevel - member.levels.length + gutter) +
      member.xpToNext +
      '\n'
  })
  st += '```'
  return st
}

function showPartyLevels(channel) {
  console.log(`Get party levels for ${partyName}`)
  const pty = party.getParty(partyName)
  if (!pty) {
    channel.send('Party not found.')
    return
  }
  const json = party.getPartyLevels(pty, 0)
  const partyInfo = formatPartyLevels(json)
  channel.send(partyInfo)
}

async function addPartyXp(channel, xpToAdd) {
  console.log(`Add ${xpToAdd} xp to ${partyName}`)
  const pty = party.getParty(partyName)
  if (!pty) {
    channel.send('Party not found.')
    return
  }
  const result = await party.updateXp(party.Actions.add, xpToAdd, pty)
  if (!result.success) {
    channel.send('Failed to save party XP.')
    return
  }
  showPartyLevels(channel)
}

client.once('ready', async () => {
  try {
    await gameData.initialize(secret, { discordClient: client })
    console.log('OSDnD bot connected to Discord; gameData loaded from DisDB')
  } catch (e) {
    console.error('gameData.initialize failed', e)
    process.exit(1)
  }
})

// handle discord commands
client.on('messageCreate', async (message) => {
  if (message.content.startsWith('!party xp')) {
    if (!message.member.roles.cache.find((role) => role.name === 'DM')) {
      message.channel.send('Command requires DM role.')
      return
    }
    const param = message.content.substring(10)
    if (isNaN(param)) return
    const xpToAdd = parseInt(param, 10)
    await addPartyXp(message.channel, xpToAdd)
    message.delete().catch(() => {})
  } else if (message.content == '!party') {
    showPartyLevels(message.channel)
    message.delete().catch(() => {})
  }
})

client.login(secret.loginToken)
