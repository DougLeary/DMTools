const data = require('./names.json')
const gens = (data) ? data.generators : []

function doBlock(block) {
  const id = block.charAt(0)
  const arr = block.substr(2).split(',')
  const pos = Math.floor(Math.random() * arr.length)
  const st = arr[pos]
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

function useRule(gen) {
  if (!gen.rule || !gen.blocks) return ''
  const steps = gen.rule.split(',')
  let result = ''
  for (let n in steps) {
     const st = doStep(gen, steps[n])
     if (st == '.') return result
     if (st != '-') result += st
  }
  return result
}

function newName(type='', flavor='') {
  if (type) {
    for (let i in gens) {
      const gen = gens[i]
      const genFlavor = (gen.hasOwnProperty("flavor")) ? gen.flavor : ''
      if (gen.type == type && genFlavor == flavor) return useRule(gen)
    }
  }
  return `NPC ${type}`
}

module.exports = {
  newName: newName
}
