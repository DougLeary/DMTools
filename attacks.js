// roll a number of attacks by a creature with thaco and damage dice against an AC and display the number of hits and total damage
const DieRoll = require('./dieRoll')

const attackDice = DieRoll.parse('d20')
const defaultAttacks = 1
const defaultThaco = 10
const defaultDamage = 'd20'
const defaultAC = 0 

// new goal for this is to support a web UI for multiple attack and damage rolls
// to simplify DMing battles against groups of monsters. 

function roll(attacks, thaco, damage, ac) {
  const _attacks = attacks || defaultAttacks
  const _thaco = thaco || defaultThaco
  const _damageDice = DieRoll.parse(damage || defaultDamage)
  const _ac = ac || defaultAC
  
  if (isNaN(attacks) || isNaN(ac) 
  || Math.floor(attacks) != attacks
  || Math.floor(thaco) != thaco 
  || Math.floor(ac) != ac) {
    console.log("Number of attacks and target AC must both be integers.")
    return
  }

  let hits = []
  let totalDamage = 0
  for (let i=0; i<_attacks; i++) {
    const roll = attackDice.roll().total
    if (_thaco - _ac <= roll) {
      // it's a hit
      const dmg = _damageDice.roll().total
      hits.push(dmg)
      totalDamage += dmg
    }
  }
  let content = "no hits"
  if (totalDamage > 0) {
    const hitsTag = (hits.length == 1) ? 'hit' : 'hits'
    const totalTag = (hits.length > 1) ? `total ${totalDamage}` : ''
    content = `${hits.length} ${hitsTag}, damage ${hits.toString()} ${totalTag}`
  }
  return content
}

module.exports = {
  roll: roll
}
