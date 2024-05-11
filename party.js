const partyFilename = './data/party.json'
let parties = require(partyFilename)
const classes = require("./classes")
const fs = require('fs')

function savePartyData() {
  const result = {success: true}
  try {
    fs.writeFileSync(partyFilename, JSON.stringify(parties, null, 2), 'utf8')
    console.log(`${partyFilename} updated`)
  } catch (error) {
    console.log(`Error writing file ${partyFilename}`)
    result.success = false
  }
  return result
}

function reloadPartyData() {
  parties = require(".classes")
}

function addPartyXp(party, xp) {
  const partyXp = parseInt(party.xp) + parseInt(xp)
  party.xp = String(partyXp)
  return savePartyData()
}

function addPartyMemberXp(party, memberName, xp) {
  party.members.forEach((member) => {

  })
  const partyXp = parseInt(party.xp) + parseInt(xp)
  party.xp = String(partyXp)
  return savePartyData()
}

function getPartyNames() {
  const arr = []
  for (let p in parties) {
    arr.push(parties[p].name)
  }
  return arr
}

function getParty(name) {
  for (let p in parties) {
    if (parties[p].name == name) {
      return parties[p]
    }
  }
  return {name: "Unknown Party", members: []}
}

function getPartyLevels(party, xp) {
  // for each class of each non-hidden party member, return the class level and the xp needed to level up;
  
  // empty result skeleton
  const result = {name: party.name, xp: (xp == 0) ? party.xp : xp, members: []}

  // 
  party.members.forEach((mem) => {
    if (!mem.hasOwnProperty("hide")) {    // skip hidden members
      const member = {name: mem.name, class: mem.class, level: "0"}
      const xpParam = (xp > 0) ? xp : party.xp
      const chClasses = mem.class.split('/')
      const chLevel = []
      let xpToNext = []
      for (let c in chClasses) {
        const getsBonus = (mem.xpBonus.substring(c,c+1) == 'y')
        const useXp = getsBonus ? Math.floor(xpParam * 1.1) : xpParam
        //console.log(`${member.name} bonus: ${mem.xpBonus}, ${c}:${mem.xpBonus.substring(c,c)} ${chClasses[c]} useXp ${useXp} getsBonus ${getsBonus}`)
        const lev = classes.getCharacterLevel(party.system, mem.edition, chClasses[c], Math.floor(useXp / chClasses.length))
        chLevel.push(lev.level)
        xpToNext .push(getsBonus ? Math.floor(lev.xpToNext / 1.1) : lev.xpToNext)
      }
      if (mem.hasOwnProperty("boss")) {
        member.boss = mem.boss
        member.level = ''
        member.xpToNext = ''
      } else {
        member.level = chLevel.join('/')
        member.xpToNext = xpToNext.join(' / ')
      }
      result.members.push(member)
    }
  })
  // report all henchman levels as their boss's lowest level - 2
  result.members.forEach((hench) => {
    if (hench.hasOwnProperty("boss")) {
      let minBossLevel = 99999
      // find the boss
      result.members.forEach((mem) => {
        if (mem.name == hench.boss) {
          // get the boss's lowest level
          const bossLevels = mem.level.split('/')
          minBossLevel = bossLevels[0]
          for (let i = 1; i < bossLevels.length; i++) {
            minBossLevel = Math.min(minBossLevel, bossLevels[i])
          }
        }
      })
      const henchLevels = []
      for (let c in hench.class.split('/')) {
        henchLevels.push(minBossLevel - 2)
      }
      hench.level = henchLevels.join('/')
    }
  })
  return result
}

module.exports = {
  getParty,
  getPartyNames,
  getPartyLevels,
  addPartyXp,
  addPartyMemberXp,
  reloadPartyData
}
