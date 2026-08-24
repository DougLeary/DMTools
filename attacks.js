// roll a number of attacks by a creature with thaco and damage dice against an AC and display the number of hits and total damage
const DieRoll = require('./dieRoll')

const attackDice = DieRoll.parse('d20')
const defaultThaco = 10
const defaultDamage = 'd6'
const defaultAC = 0 

// new goal for this is to support a web UI for multiple attack and damage rolls
// to simplify DMing battles against groups of monsters. 

function roll(attacks, thaco, damage, acList) {
  const _thaco = thaco || defaultThaco
  const _dmg = (damage || defaultDamage).replace(' ','').split(',')   // syntax; single "d8", multiple "d4/d4/d8..." or "d4,d4,d8..."
  const _acList = (acList || defaultAC).replace(' ','').split(',')    // syntax: single "3", multiple "3,-1x2,-1..."

  const damageDice = []    // DieRoll objects
  const results = []       // result objects: {ac, [damage roll values], totalDamage, text}

  // parse and validate inputs
  try { 
    for (let i in _dmg) {
      damageDice.push(DieRoll.parse(_dmg[i]))
    }
  } catch(err) {
    console.log(`Invalid damage dice syntax: "${damage}"`)
    return null
  } 

  try { 
    for (let i in _acList) {
      const item = {"ac": 10, "attackers": 1}
      const arr = _acList[i].split("x")
      const attackers = (arr.length == 1) ? 1 : arr[1]
      const ac = arr[0]
      results.push({ "ac": parseInt(ac), "attackers": attackers, "hits": [], "total": 0, "text": ""})
    }
  } catch(err) {
    console.log(`Improper AC syntax: "${acList}"`)
    return null
  }

  // perform all attack rolls against all ACs and accumulate damage
  for (r in results) {
    const result = results[r]
    // roll all attacks against the AC
    for (let a = 1; a <= result.attackers; a++) {
      for (let i in damageDice) {
        const toHit = attackDice.roll().total
        if (_thaco - result.ac <= toHit) {
          // it's a hit
          const dmg = damageDice[i].roll().total
          result.hits.push(dmg)
          result.total += dmg
        }
      }
    }
    const txtAC = `AC ${result.ac}:`
    let txtHits = ""
    const hitCount = result.hits.length
    if (hitCount == 0) {
      txtHits = "no hits"
    } else if (hitCount == 1) { 
      txtHits = `1 hit for ${result.hits[0]}`
    } else {
      const txtAtk = (result.attackers > 1) ? ` by ${result.attackers} attackers,` : ""
      txtHits = `${hitCount} hits (${result.hits.join(",")})${txtAtk} total: ${result.total}`
    }
    result.text = `AC ${result.ac}: ${txtHits}`
  }

  return results
}

module.exports = {
  roll: roll
}
