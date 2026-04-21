const DieRoll = require('./dieRoll')
const savingThrow = DieRoll.parse('d20')
const maxSave = savingThrow.max()

function eq(str1, str2) {
  return (String(str1).toLowerCase() == String(str2).toLowerCase())
}

/** @type {Array<{ name: string, text: string, editions: object[] }>} */
let systems = []

function setSystems(tree) {
  systems = Array.isArray(tree) ? tree : []
}

function loadSystemsFromFile() {
  const data = require('./data/classes.json')
  systems = data.systems || []
}

// Default: file-based until gameData.initialize() calls setSystems()
loadSystemsFromFile()

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
  if (!edition) return []
  const fx = edition.effects
  return Array.isArray(fx) ? fx : []
}

function getClasses(systemName, editionName) {
  // systemName is required; if editionName is present get that edition's classes, else get all classes in the system
  const list = []
  if (editionName) {
    const edition = getEdition(systemName, editionName)
    if (!edition) return list
    edition.classes.forEach((cls) => {
      list.push(cls.name)
    })
    return list
  }
  const system = getSystem(systemName)
  if (system) {
    system.editions.forEach((ed) => {
      const item = { edition: ed.name, text: ed.text, classes: [] }
      ed.classes.forEach((cls) => {
        item.classes.push(cls.name)
      })
      list.push(item)
    })
  }
  return list
}

function getClass(systemName, editionName, className) {
  console.log(`getClass(${systemName}, ${editionName}, ${className})`)
  const system = getSystem(systemName)
  if (system) {
    if (editionName) {
      const ed = getEdition(systemName, editionName)
      if (!ed) return null
      for (let c in ed.classes) {
        const cls = ed.classes[c]
        if (eq(cls.name, className)) {
          return { edition: ed, class: cls }
        }
      }
    } else {
      // find the first matching class in any edition
      for (let ed in system.editions) {
        const edition = system.editions[ed]
        for (const cls of edition.classes) {
          if (eq(cls.name, className)) {
            return { edition, class: cls }
          }
        }
      }
    }
  }
  return null
}

function findClassAcrossSystems(editionName, className) {
  for (const sys of systems) {
    const c = getClass(sys.name, editionName, className)
    if (c) return c
  }
  return null
}

function findClassByNameOnly(className) {
  for (const sys of systems) {
    const c = getClass(sys.name, null, className)
    if (c) return c
  }
  return null
}

function getClassLevel(cls, xp) {
  console.log(`getClassLevel(${cls.name}, ${xp})`)
  const levels = cls.levels
  const nLevels = levels.length
  const result = { level: 0, xpToNext: 1 }

  let level = 0
  let xpToNext = 1 // XP to reach the next level (i.e. top of current level +1)
  let levelRange = 0 // XP per level, for levels above the table

  if (nLevels == 1) {
    // use the one level value we have as levelRange and calculate the current level
    levelRange = levels[0]
    result.level = Math.floor(xp / levelRange) + 1
    result.xpToNext = levelRange * level + 1 - xp
    return result
  } else if (nLevels > 1) {
    for (let i = 0; i < nLevels; i++) {
      // found xp in the levels array
      if (levels[i] >= xp) {
        result.level = i + 1
        result.xpToNext = levels[i] + 1 - xp
        return result
      }
    }
    if (level == 0) {
      // xp is beyond the table
      levelRange = levels[nLevels - 1] - levels[nLevels - 2]
      const xpExcess = xp - levels[nLevels - 1]
      const extraLevels = Math.floor(xpExcess / levelRange) + 1
      result.level = nLevels + extraLevels
      result.xpToNext = extraLevels * levelRange - xpExcess
    }
  }
  return result
}

function getCharacterLevel(systemName, editionName, className, xp) {
  console.log(`getCharacterLevel(${systemName}, ${editionName}, ${className}, ${xp})`)
  const cls = getClass(systemName, editionName, className)
  if (cls) return getClassLevel(cls.class, xp)
  return null
}

function getAllLevels(systemName, xp) {
  // for each class in the system find the level corresponding to xp
  const result = { name: 'All Classes', xp: xp, members: [] }
  const system = getSystem(systemName)
  if (system) {
    system.editions.forEach((ed) => {
      ed.classes.forEach((cls) => {
        const obj = getClassLevel(cls, xp)
        obj.edition = ed.name
        obj.class = cls.name
        result.members.push(obj)
      })
    })
  }
  return result
}

function getSaves(systemName, editionName, className, level) {
  // Get saving throw values for a class and level
  let theClass = null
  if (systemName) {
    theClass = getClass(systemName, editionName, className)
  } else if (editionName) {
    theClass = findClassAcrossSystems(editionName, className)
  } else {
    theClass = findClassByNameOnly(className)
  }

  if (theClass && theClass.class.saves) {
    const rawSaveAs = theClass.class.saveAs || theClass.class.name
    const saveAs = rawSaveAs.split('/')
    const needs = []
    const effects = Array.isArray(theClass.edition.effects) ? theClass.edition.effects : []
    // start with a list of worst possible saves for all effects
    for (let e in effects) {
      needs.push({
        effect: effects[e],
        need: maxSave,
      })
    }
    // for every class the class can save as, update the needs list with best values
    saveAs.forEach((saveClass) => {
      for (let c in theClass.edition.classes) {
        const aClass = theClass.edition.classes[c]
        if (eq(aClass.name, saveClass)) {
          if (!aClass.saves) return
          for (let v in aClass.saves) {
            if (aClass.saves[v].upto >= level) {
              for (let e in effects) {
                const needArr = aClass.saves[v].need
                if (needArr && needArr[e] !== undefined) {
                  needs[e].need = Math.min(needs[e].need, needArr[e])
                }
              }
              break
            }
          }
        }
      }
    })
    return {
      edition: theClass.edition.name,
      class: theClass.class.name,
      saveAs: theClass.class.saveAs,
      level: level,
      saves: needs,
    }
  }
  return {}
}

function rollSaves(saves, editionName, className, level) {
  // roll a series of saving throws and return results (true=success, false=failure) for all things
  const lvl = typeof level === 'number' ? level : parseInt(level, 10)
  const results = getSaves(null, editionName, className, lvl)
  results.rolls = []
  const saveRows = results.saves || []
  const n = parseInt(saves, 10) || 0
  for (let i = 0; i < n; i++) {
    const roll = savingThrow.roll().total
    results.rolls.push({ roll: roll, saves: [] })
    for (let j = 0; j < saveRows.length; j++) {
      results.rolls[i].saves.push(roll >= saveRows[j].need)
    }
  }
  return results
}

module.exports = {
  setSystems,
  getClasses,
  getEffects,
  getClass,
  getClassLevel,
  getCharacterLevel,
  getAllLevels,
  getSaves,
  rollSaves,
  getEditions,
}
