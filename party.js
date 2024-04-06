const parties = require("./party.json")
const classes = require("./classes")

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
    if (mem.hasOwnProperty("hide")) { continue }   // don't show hidden members
    const member = {name: mem.name, class: mem.class, level: "0"}
    const xpParam = (xp > 0) ? xp : party.xp
    const chClasses = mem.class.split('/')
    const chLevel = []
    let xpToNext = []
    for (let c in chClasses) {
      const getsBonus = (mem.xpBonus.substring(c,c+1) == 'y')
      const useXp = getsBonus ? Math.floor(xpParam * 1.1) : xpParam
      //console.log(`${member.name} bonus: ${mem.xpBonus}, ${c}:${mem.xpBonus.substring(c,c)} ${chClasses[c]} useXp ${useXp} getsBonus ${getsBonus}`)
      const lev = classes.getCharacterLevel(mem.edition, chClasses[c], Math.floor(useXp / chClasses.length))
      chLevel.push(lev.level)
      xpToNext .push(getsBonus ? Math.floor(lev.xpToNext / 1.1) : lev.xpToNext)
    }
    if (mem.hasOwnProperty("boss")) {
      member.boss = mem.boss
      member.level = ''
      member.xpToNext = ''
    } else {
      member.level = chLevel.join('/')
      member.xpToNext = xpToNext.join('/')
    }
    result.members.push(member)
  }
  // assign all henchman levels to boss's lowest level - 2
  for (let m in result.members) {
    const hench = result.members[m]
    if (hench.hasOwnProperty("boss")) {
      let minBossLevel = 99999
      // find the boss
      for (let b in result.members) {
        if (result.members[b].name == hench.boss) {
          // get the boss's lowest level
          const bossLevels = result.members[b].level.split('/')
          minBossLevel = bossLevels[0]
          for (let i = 1; i < bossLevels.length; i++) {
            minBossLevel = Math.min(minBossLevel, bossLevels[i])
          }
        }
      }
      const henchLevels = []
      for (let c in hench.class.split('/')) {
        henchLevels.push(minBossLevel - 2)
      }
      hench.level = henchLevels.join('/')
    }
  }
  return result
}

module.exports = {
  getParty: getParty,
  getPartyNames: getPartyNames,
  getPartyLevels: getPartyLevels
}
