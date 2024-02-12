const data = require("./levels.json")
const party = require("./party.json")

function getClassLevel(_class, xp) {
  // _class is an object from the editions structure
  // returns object {level: n, xpToNext n}
  const levels = _class.levels
  const nLevels = levels.length
  const result = { name: "unknown", class: "unknown", level: 0, xpToNext: 1 }

  let level = 0
  let xpToNext = 1      // XP to reach the next level (i.e. top of current level +1)
  let levelRange = 0    // XP per level, for levels above the table

  if (nLevels == 1) {
    // use the one level value we have as levelRange and calculate the current level
    levelRange = levels[0]
    result.level = Math.floor(xp / levelRange) + 1
    result.xpToNext = levelRange * level + 1 - xp
    return result
  } else if (nLevels > 1) {
    for (let i=0; i < nLevels; i++) {
      // found xp in the levels array 
      if (levels[i] > xp) {
        result.level = i+1
        result.xpToNext = levels[i] + 1 - xp
        return result
      } 
    }
    if (level == 0) {
      // xp is beyond the table
      levelRange = levels[nLevels-1] - levels[nLevels-2]
      const xpExcess = xp - levels[nLevels-1]
      const extraLevels = Math.floor(xpExcess / levelRange)
      result.level = nLevels + extraLevels
      result.xpToNext = levels[nLevels-1] + (extraLevels * levelRange) + 1 - (xpExcess % levelRange)
    }
  }
  return result
}

function getCharacterLevel(editionName, className, xp) {
  for (let e in data.editions) {
    if (data.editions[e].name == editionName) {
      for (let c in data.editions[e].classes) {
        if (data.editions[e].classes[c].name == className) {
          return (getClassLevel(data.editions[e].classes[c], xp))
        }
      }
    }
  }
}

function getPartyLevels(xp) {
  const list = []
  for (let m in party.members) {
    const member = party.members[m]
    const result = {name: member.name, class: member.class, level: "0"}
    const xpParam = (xp > 0) ? xp : party.xp
    const useXp = (member.xpBonus) ? Math.floor(xpParam * 1.1) : xpParam
    const chClasses = member.class.split('/')
    let chLevel = ''
    let xpToNext = ''
    for (let c in chClasses) {
      const lev = getCharacterLevel(member.edition, chClasses[c], useXp/chClasses.length)
      chLevel += lev.level + '/'
      xpToNext += lev.xpToNext + '/'
    }
    result.level = chLevel.slice(0,-1)
    result.xpToNext = xpToNext.slice(0,-1)
    list.push(result)
  }
  return list
}

function getAllLevels(xp) {
  // for each known class find the level corresponding to xp
  const list = []
  for (let e=0; e < data.editions.length; e++) {
    const ed = data.editions[e]
    for (let c=0; c < ed.classes.length; c++) {
      const _class = data.editions[e].classes[c]
      const obj = getClassLevel(_class, xp)
//      console.log(`xp=${xp}, level=${obj.level}, xpToNext=${obj.xpToNext}`)
      obj.edition = ed.name
      obj.class = _class.name
      list.push(obj)
    }
  }
  return list
}

module.exports = {
  getClassLevel: getClassLevel,
  getCharacterLevel: getCharacterLevel,
  getPartyLevels: getPartyLevels,
  getAllLevels: getAllLevels
}