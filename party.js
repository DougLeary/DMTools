const partyFilename = './data/party.json'
let parties = require(partyFilename)
const classes = require("./classes")
const fs = require('fs')

function eq(str1, str2) {
  return (String(str1).toLowerCase() == String(str2).toLowerCase())
}

function getPartyNames() {
  const arr = []
  parties.forEach((party) => { arr.push(party.name) })
  return arr
}

function getParty(name) {
  let p = null
  parties.forEach((party) => { 
    if (eq(party.name, name)) { p = party }
  })
  return p
}

function getPartyMember(party, memberName) {
  for (let member in party.members) {
    if (eq(member.name, memberName)) { return member }
  }
  return null
}

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

function addMemberXp(member, xp, toClass = null) {
  // internal function to add xp to a party member, optionally to one class
  if (!member || isNaN(xp) || member.hide) return false
  if (member.splitClass) {
    // add xp to split class only
    member.classes.forEach((cls) => {
      if (eq(cls.name, member.splitClass)) {
        // if toClass is given it can only be the split class
        if (!toClass || eq(cls.name, toClass)) {
          cls.xp += (cls.getsBonus) ? Math.round(xp * 1.1) : xp
          cls.level = classes.getCharacterLevel(party.system, member.edition, cls, cls.xp)
        }
      }
    })
  } else {
    // divide xp between classes
    let classXp = Math.round(xp / member.classes.count)
    member.classes.forEach((cls) => {
      cls.xp += (cls.getsBonus) ? Math.round(classXp * 1.1) : classXp
    })
  }
  return true
}

function addXp(member, xp, toClass = null) {
  // external path to addMemberXp; saves json data after adding
  if (addXp(member, xp, toClass)) return savePartyData()
  return false
}

function addPartyXp(party, xp) {
  // add  to the common party xp and update all members by this amount, +10% bonus for those who get it
  if (!party || isNaN(xp)) return false
  party.xp += xp
  party.members.forEach((member) => {
    if (!member.hide) { addMemberXp(member, xp) }
  })
  return savePartyData()
}

function getPartyLevels(party, xp) {
  // for each class of each non-hidden party member, return the class level and the xp needed to level up;
  const result = {name: party.name, xp: (xp == 0) ? party.xp : xp, members: []}
  party.members.forEach((mem) => {
    if (!mem.hide) {    // skip hidden members
      const member = {name: mem.name, class: mem.class, level: "0"}
      const chLevel = []
      let xpToNext = []
      for (let c in chClasses) {
        const xpParam = (xp > 0) ? xp : party.xp
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
        if (eq(mem.name, hench.boss)) {
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
  addMemberXp,
  reloadPartyData
}
