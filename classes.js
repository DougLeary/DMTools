const data = require("./classes.json")

function getEditions() {
  const list = []
  for (let e in data.editions) {
    list.push(data.editions[e].name)
  }
  return list
}

function getClasses() {
  const list = []
  for (let e in data.editions) {
    const ed = data.editions[e]
    const item = { edition: ed.name, text: ed.text, classes: [] }
    for (let c in ed.classes) {
      item.classes.push(ed.classes[c].name)
    }
    list.push(item)
  }
  return list
}

function getEditionClasses(editionName) {
  const list = []
  for (let e in data.editions) {
    const ed = data.editions[e]
    if (ed.name == editionName) {
      for (let c in ed.classes) {
        list.push(ed.classes[c].name)
      }
    }
  }
  return list
}

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
      if (levels[i] >= xp) {
        result.level = i+1
        result.xpToNext = levels[i] + 1 - xp
        return result
      } 
    }
    if (level == 0) {
      // xp is beyond the table
      levelRange = levels[nLevels-1] - levels[nLevels-2]
      const xpExcess = xp - levels[nLevels-1]
      const extraLevels = Math.floor(xpExcess / levelRange) + 1
      result.level = nLevels + extraLevels
      //console.log(`${_class.name} xp ${xp} beyond table, range=${levelRange}, highest=${nLevels} (${levels[nLevels-1]}), excess=${xpExcess}, extraLevels=${extraLevels}, result=${result.level}`)
      result.xpToNext = (extraLevels * levelRange) - xpExcess
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

function getAllLevels(xp) {
  // for each known class find the level corresponding to xp
  const result = {name: "All Classes", xp: xp, members: []}
  for (let e=0; e < data.editions.length; e++) {
    const ed = data.editions[e]
    for (let c=0; c < ed.classes.length; c++) {
      const _class = data.editions[e].classes[c]
      const obj = getClassLevel(_class, xp)
//      console.log(`xp=${xp}, level=${obj.level}, xpToNext=${obj.xpToNext}`)
      obj.edition = ed.name
      obj.class = _class.name
      result.members.push(obj)
    }
  }
  return result
}

module.exports = {
  getClasses,
  getEditionClasses,
  getClassLevel,
  getCharacterLevel,
  getAllLevels
}