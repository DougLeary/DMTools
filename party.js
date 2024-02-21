const parties = require("./party.json")
const levels = require("./levels")

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
  const result = {name: party.name, xp: (xp == 0) ? party.xp : xp, members: []}
  for (let m in party.members) {
    const mem = party.members[m]
    const member = {name: mem.name, class: mem.class, level: "0"}
    const xpParam = (xp > 0) ? xp : party.xp
    const useXp = (mem.xpBonus) ? Math.floor(xpParam * 1.1) : xpParam
    const chClasses = mem.class.split('/')
    let chLevel = ''
    let xpToNext = ''
    for (let c in chClasses) {
      const lev = levels.getCharacterLevel(mem.edition, chClasses[c], useXp/chClasses.length)
      chLevel += lev.level + '/'
      xpToNext += lev.xpToNext + '/'
    }
    member.level = chLevel.slice(0,-1)
    member.xpToNext = xpToNext.slice(0,-1)
    result.members.push(member)
  }
  return result
}

module.exports = {
  getParty: getParty,
  getPartyNames: getPartyNames,
  getPartyLevels: getPartyLevels
}
