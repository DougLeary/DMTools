//  names.js - Name Generator-inator
//  This module generates names from a json file that contains a set of generators.

const data = require('./data/names.json')
const gens = (data) ? data.generators : []

function doBlock(block) {
  const id = block.charAt(0)
  const comma = String.fromCharCode(12)   // temporarily replaces ",,"
  const arr = block.substr(2).replace(',,', comma).split(',')
  const pos = Math.floor(Math.random() * arr.length)
  let st = arr[pos].replace(comma, ',')
  if (st.includes('[') && st.includes(']')) {
    const gen = st.substring(st.indexOf('[') + 1, st.indexOf(']'))
    st = st.replace(`[${gen}]`, getName(gen))
  }
  return (st.length > 1) ? st.trimEnd() : st // remove trailing spaces unless the string is a single space
}

function doStep(gen, step) {
  // pick random character from step
  const ch = step.charAt(Math.floor(Math.random() * step.length))
  if (ch < 'A') return ch 
  const block = String(ch).charCodeAt(0) - 65   // map A,B,C... to 0,1,2...
  if (block < gen.blocks.length) return doBlock(gen.blocks[block])
  return ''
}

function doRule(gen, rule) {
  if (!rule || !gen.blocks) return ''
  const spaced = (rule.substr(0,1) == ' ')
  const steps = rule.trim().split(',')
  let result = ''
  for (let n in steps) {
     const st = doStep(gen, steps[n])
     if (st == '.') return result.trim()
     if (st != '-') {
      if (spaced && st.startsWith(',')) result = result.trim()    // remove space before comma
      result += st + (spaced ? ' ' : '')
     }
  }
  return result.trim()
}

function getName(type='', flavor='') {
  // return a generated name of a given type and flavor
  if (type) {
    for (let i in gens) {
      const gen = gens[i]
      const genFlavor = (gen.hasOwnProperty("flavor")) ? gen.flavor : ''
      if (gen.type == type && genFlavor == flavor) {
        // do a plain rule or a selected rule from a rule array
        return doRule(gen, (Array.isArray(gen.rule)) ? gen.rule[Math.floor(Math.random() * gen.rule.length)] : gen.rule) 
      }
    }
  }
  return `NPC ${type}`.trim()
}

function getGenerators() {
  // return a list of generators and their flavors
  arr = []
  for (let i in gens) {
    const gen = gens[i]
    arr.push({type: gen.type, flavor: (gen.hasOwnProperty('flavor')) ? gen.flavor : ''})
  }
  return arr
}

module.exports = {
  getName, 
  getGenerators
}
