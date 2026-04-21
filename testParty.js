const secret = require('./secret')
const gameData = require('./gameData')
const party = require('./party')

const pName = 'Baker Street Bakers'

function formatName(member) {
  if (member.hide) return `(${member.name})`
  return member.name
}

;(async () => {
  try {
    await gameData.initialize(secret)
  } catch (e) {
    console.error(e)
    process.exit(1)
  }

  const p = party.getParty(pName)
  if (!p) {
    console.error('Party not found:', pName)
    process.exit(1)
  }

  console.log(pName)
  console.log('------------------------------')
  for (const m of p.members) {
    console.log(formatName(m))
  }

  await gameData.shutdown()
})()
