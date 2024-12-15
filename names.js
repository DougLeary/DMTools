//  names.js - Name Generator-inator
//  This module generates names from a json file that contains a set of generators.
const { singularOf, pluralOf } = require('./pluralizer.js') 

const gens = []
const defaultPath = './data/names.json'

let pluralizeNextBlock = false

function load(path = defaultPath) {
  const resolved = require.resolve(path)
  delete require.cache[resolved]
  const data = require(path)
  gens.length = 0
  data.forEach((gen) => {
    gens.push(gen)
  })
}

function eq(str1, str2) {
  return (String(str1).toLowerCase() == String(str2).toLowerCase())
}

function doBlock(block) {
  const id = block.charAt(0)
  const comma = String.fromCharCode(12)   // temporarily replaces ",,"
  const colon = block.indexOf(':')
  const modifiers = block.substr(1,colon-1)
  const skipPluralizing = modifiers.includes('*')
  const pluralize = pluralizeNextBlock && !skipPluralizing
  pluralizeNextBlock = modifiers.includes('+') || (pluralizeNextBlock && skipPluralizing)
  const arr = block.substr(colon+1).replace(',,', comma).split(',')
  const pos = Math.floor(Math.random() * arr.length)
  let st = arr[pos].replace(comma, ',')
  if (st.includes('[') && st.includes(']')) {
    const gen = st.substring(st.indexOf('[') + 1, st.indexOf(']'))
    st = st.replace(`[${gen}]`, getName(gen))
  }

  st = (st.length > 1) ? st.trimEnd() : st // remove trailing spaces unless the string is a single space
  return pluralize ? pluralOf(st) : st
}

function doStep(gen, step) {
  // pick random character from step
  const ch = step.charAt(Math.floor(Math.random() * step.length))
  if (ch < 'A') return ch 
  let block = ""
  for (let i=0; i<gen.blocks.length; i++) {
    if (gen.blocks[i].startsWith(ch)) return doBlock(gen.blocks[i])
  }
  return ''
}

function doRule(gen, rule) {
  if (!rule || !gen.blocks) return ''
  const spaced = (rule.substr(0,1) == ' ')
  const steps = rule.trim().split(',')
  let result = ''
  let priorA = false   // for converting "A" to "An"
  for (let n in steps) {
    let st = doStep(gen, steps[n])
    if (st == '.') return result.trim()
    if (st != '-') {
      if (spaced && st.startsWith(',')) { result = result.trim() }   // remove space before comma
      if (priorA) {
        if ("aeiou".includes(st.charAt(0).toLowerCase())) {
          result = result.trim() + "n "
        }
        priorA = false
      } else if (spaced && st.toLowerCase().endsWith("a(n)")) { 
        st = st.replace("(n)", "")
        priorA = true 
      }
      result += st + (spaced ? ' ' : '')
    }
  }
  return result.trim()
}

function getName(type='', flavor='') {
  // return a generated name of a given type and flavor

  // First fill an array with generators that satisfy the criteria:
  //  - there is no type preference, OR
  //  - gen.type is right and there's no flavor preference, OR
  //  - gen.type is right and gen.flavor is right
  arr = []
  gens.forEach((gen) => {
    if ((!type) || (eq(gen.type, type) && (!(flavor) || eq(gen.flavor, flavor)))) {
      arr.push(gen)
    }
  })
  if (arr.length > 0) {
  // perform one of the found generators
    let gen = arr[Math.floor(Math.random() * arr.length)]
    return doRule(gen, (Array.isArray(gen.rule)) ? gen.rule[Math.floor(Math.random() * gen.rule.length)] : gen.rule) 
  } else {
    // return a dummy result
    return `random ${type}`.trim()
  }
}

function getGeneratorNames(type=null) {
  // return a list of all generators or just those of a given type
  arr = []
  gens.forEach((gen) => {
    if (gen.show &&(!type || eq(gen.type, type))) {
      arr.push({type: gen.type, flavor: gen.flavor || ''})
    }
  })
  return arr
}

module.exports = {
  load,
  getName, 
  getGeneratorNames
}
