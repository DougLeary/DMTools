const classes = require("./classes")
const DieRoll = require('./dieRoll')
const savingThrow = DieRoll.parse('d20')

function eq(str1, str2) {
  return (String(str1).toLowerCase() === String(str2).toLowerCase())
}

function getSaves(editionName, className, level) {
  // Get saving throw values for an edition, class and level;
  //   if edition is missing use the first edition with a matching class.
  // A class saves as its saveAs class or multiple classes ("class1/class2/...");
  //   if multiple get the best save for each effect
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
    for (let i=0; i < theClass.edition.effects.length; i++) {
      needs.push({
        effect: theClass.edition.effects[i],
        need: 20
      })
    }
    // for every class the class can save as, update the needs list with best values
    for (let sa = 0; sa < saveAs.length; sa++) {
      for (let s=0; s < theClass.edition.classes.length; s++) {
        const aClass = theClass.edition.classes[s]
        if (eq(aClass.name, saveAs[sa])) {
          for (let n=0; n < aClass.levels.length; n++) {
            if (aClass.levels[n].upto >= level) {
              // found the level; replace needs values if the found values are better
              for (let i=0; i < theClass.edition.effects.length; i++) {
                needs[i].need = Math.min(needs[i].need, aClass.levels[n].need[i])
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
