const classes = require("./classes.json")
const saves = require("./saves.json")
const DieRoll = require('./dieRoll')
const savingThrow = DieRoll.parse('d20')

function eq(str1, str2) {
  return (String(str1).toLowerCase() === String(str2).toLowerCase())
}

function getMeta() {

}

function findEditionAndClass(className) {
  // find the first matching class in any edition
  for (let e=0; e < classes.editions.length; e++) {
    const ed = classes.editions[e]
    for (let c=0; c < ed.classes.length; c++) {
      if (eq(ed.classes[c].name, className)) {
        // found the class
        return {edition: ed, class: ed.classes[c]}
      }
    }
  }
  return null
}

function findClassInEdition(editionName, className) {
  // find a class in a specific edition
  for (let e=0; e < classes.editions.length; e++) {
    const ed = classes.editions[e]
    if (eq(ed.name, editionName)) {
      // found the edition
      for (let c=0; c < ed.classes.length; c++) {
        if (eq(ed.classes[c].name, className)) {
          // found the class
          return {edition: ed, class: ed.classes[c]}
        }
      }
      // no matching class in this edition
      return null
    }
  }
  // no matching edition
  return null
}

function getSaves(editionName, className, level) {
  // Get saving throw values for an edition, class and level;
  //   if edition is missing use the first edition with a matching class.
  // A class saves as its saveAs class or multiple classes ("class1/class2/...");
  //   if multiple get the best save for each effect
  let result = null
  if (editionName) {
    // find the class in the edition
    result = findClassInEdition(editionName, className)
  } else {
    // find the first matching class and its edition
    result = findEditionAndClass(className)
  }

  if (result) {
    // found the class, now get their best saves
    const saveAs = result.class.saveAs.split('/')
    const needs = []
    // start with a list of worst possible saves for all effects
    for (let i=0; i < saves.effects.length; i++) {
      needs.push({
        effect: saves.effects[i],
        need: 20
      })
    }
    // for every class the class can save as, update the needs list with best values
    for (let sa = 0; sa < saveAs.length; sa++) {
      for (let s=0; s < saves.classes.length; s++) {
        const aClass = saves.classes[s]
        if (eq(aClass.name, saveAs[sa])) {
          for (let n=0; n < aClass.levels.length; n++) {
            if (aClass.levels[n].upto >= level) {
              // found the level; replace needs values if the found values are better
              for (let i=0; i < saves.effects.length; i++) {
                needs[i].need = Math.min(needs[i].need, aClass.levels[n].need[i])
              }
              break
            }
          }
        }
      }
    }
    return { edition: result.edition.name, class: result.class.name, saveAs: result.class.saveAs, level: level, saves: needs }
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
  getSaves: getSaves,
  rollSaves: rollSaves
}
