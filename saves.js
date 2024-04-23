const classes = require("./classes")
const DieRoll = require('./dieRoll')
const savingThrow = DieRoll.parse('d20')

function eq(str1, str2) {
  return (String(str1).toLowerCase() == String(str2).toLowerCase())
}

function getSaves(editionName, className, level) {
  // Get saving throw values for an edition, class and level;
  //   if edition is missing use the first edition with a matching class.
  // A class saves as its saveAs class or multiple classes ("class1/class2/...");
  //   if multiple get the best save for each effect
  // console.log(`getSaves ${className} ${level}`)
  let theClass = null
  if (editionName) {
    // find the class in the edition
    theClass = classes.getClass(className, editionName)
  } else {
    // find the first matching class and its edition
    theClass = classes.getClass(className)
  }

  if (theClass) {
    // found the class, now get their best saves
    const rawSaveAs = theClass.class.saveAs || theClass.class.name
    const saveAs = rawSaveAs.split('/')
    const needs = []
    // start with a list of worst possible saves for all effects
    for (let e in theClass.edition.effects) {
      needs.push({
        effect: theClass.edition.effects[e],
        need: 20
      })
    }
    // for every class the class can save as, update the needs list with best values
    for (let sa in saveAs) {
      for (let c in theClass.edition.classes) {
        const aClass = theClass.edition.classes[c]
        if (eq(aClass.name, saveAs[sa])) {
          // console.log(`  getting ${aClass.name} saves`)
          for (let v in aClass.levels) {
            // console.log(`  is level ${level} upto ${aClass.saves[v].upto}`)
            if (aClass.saves[v].upto >= level) {
              // console.log(`save as upto ${aClass.saves[v].upto}`)
              // found the level; replace needs values if the found values are better
              for (let e in theClass.edition.effects) {
                // console.log(`  comparing ${needs[e].need} with ${aClass.saves[v].need[e]}`)
                needs[e].need = Math.min(needs[e].need, aClass.saves[v].need[e])
              }
              break
            }
          }
        }
      }
    }
    return { edition: theClass.edition.name, class: theClass.class.name, saveAs: theClass.class.saveAs, level: level, saves: needs }
  }
  return {}
}

function rollSaves(saves, edition, className, level) {
  // roll a series of saving throws and return results (true=success, false=failure) for all effects
  const results = getSaves(edition, className, level)
  results.rolls = []
  for (let i=0; i < saves; i++) {
    const roll = savingThrow.roll().total
    results.rolls.push({roll: roll, saves: []})
    for (let n=0; n < results.saves.length; n++) {
      results.rolls[i].saves.push(roll >= results.saves[n].need)
    }
  }
  return results
}

module.exports = {
  getSaves,
  rollSaves
}
