//  names.js - Name Generator-inator
//  This module generates names from a json file that contains a set of generators.
const gens = []

function init() {
  const resolved = require.resolve('./data/names.json')
  delete require.cache[resolved]
  const data = require('./data/names.json')
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
  let priorA = false   // for converting "A" to "An"
  for (let n in steps) {
    let st = doStep(gen, steps[n])
    if (st == '.') return result.trim()
    if (st != '-') {
      if (spaced && st.startsWith(',')) { result = result.trim() }   // remove space before comma
      if (priorA) {
        if ("aeiou".includes(st.charAt(0).toLowerCase())) {
          result = result.trim() + "n "
          priorA = false
        }
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
    if (!type || eq(gen.type, type)) {
      arr.push({type: gen.type, flavor: gen.flavor || ''})
    }
  })
  return arr
}

init()

module.exports = {
  init,
  getName, 
  getGeneratorNames
}
