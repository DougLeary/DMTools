const systems = require("./data/classes.json").systems
// systems.forEach((sys) => { 
//   console.log(`${sys.name}: ${sys.text}`)
//   sys.editions.forEach((ed) => {
//     console.log(`  ${ed.name}: ${ed.text}`)
//   })
// })

function eq(str1, str2) {
  return (String(str1).toLowerCase() == String(str2).toLowerCase())
}

function getSystem(systemName) {
  for (let s in systems) {
    const system = systems[s]
    if (eq(system.name, systemName)) return system
  }
  return null
}

function getEdition(systemName, editionName) {
  const system = getSystem(systemName)
  if (system) {
    for (let e in system.editions) {
      const edition = system.editions[e]
      if (eq(edition.name, editionName)) return edition
    }
  }
  return null
}

function getEditions(systemName) {
  const list = []
  const system = getSystem(systemName)
  if (system) {
    system.editions.forEach((edition) => {
      list.push(edition.name)
    })
  }
  return list
}

function getEffects(systemName, editionName) {
  const edition = getEdition(systemName, editionName)
  return (edition) ? edition.effects : []
}

function getClasses(systemName, editionName) {
  // systemName is required; if editionName is present get that edition's classes, else get all classes in the system 
  const list = []
  if (editionName) {
    const edition = getEdition(systemName, editionName)
    edition.classes.forEach((cls) => {
      list.push(cls.name)
    })
  } else {
    const system = getSystem(systemName)
    if (system) {
      system.editions.forEach((ed) => {
        const item = { edition: ed.name, text: ed.text, classes: [] }
        ed.classes.forEach ((cls) => {
          item.classes.push(ed.classes[c].name)
        })
        list.push(item)
      })
    }
    return list
  }
}

function getClass(systemName, editionName, className) {
  const system = getSystem(systemName)
  if (system) {
    if (editionName) {
      const ed = getEdition(systemName, editionName)
      for (let c in ed.classes) {
        const cls = ed.classes[c]
        if (eq(cls.name, className)) {
          return {edition: ed.name, class: cls}
        }
      }
    } else {
      // find the first matching class in any edition
      for (let ed in system.editions) {
        for (cls in system.editions[ed].classes) {
          if (eq(cls.name, className)) {
            return {edition: system.editions[ed].name, class: cls}
          }
        }
      }
    }
  }
  // no matching edition
  return null
}

function getClassLevel(cls, xp) {
  const levels = cls.levels
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
      //console.log(`${cls.name} xp ${xp} beyond table, range=${levelRange}, highest=${nLevels} (${levels[nLevels-1]}), excess=${xpExcess}, extraLevels=${extraLevels}, result=${result.level}`)
      result.xpToNext = (extraLevels * levelRange) - xpExcess
    }
  }
  return result
}

function getCharacterLevel(systemName, editionName, className, xp) {
  const cls = getClass(systemName, editionName, className)
  if (cls) return getClassLevel(cls.class, xp)
  return null
}

function getAllLevels(systemName, xp) {
  // for each class in the system find the level corresponding to xp
  const result = {name: "All Classes", xp: xp, members: []}
  const system = getSystem(systemName)
  if (system) {
    system.editions.forEach((ed) => {
      ed.classes.forEach((cls) => {
        const obj = getClassLevel(cls, xp)
//      console.log(`xp=${xp}, level=${obj.level}, xpToNext=${obj.xpToNext}`)
        obj.edition = ed.name
        obj.class = cls.name
        result.members.push(obj)
      })
    })
  }
  return result
}

module.exports = {
  getClasses,
  getEffects,
  getClass,
  getClassLevel,
  getCharacterLevel,
  getAllLevels
}
