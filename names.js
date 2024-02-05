const data = require('./names.json')
const gens = (data) ? data.generators : []

function doBlock(block) {
  const ch = block.charAt(0)
  if (isNaN(ch)) return ''
  const size = parseInt(ch)
  const pos = Math.floor(Math.random() * (block.length - 1) / size)
  return block.substr((pos)*size + 1, size)
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

function newName(_type='', _flavor='') {
  if (_type) {
    for (let i in gens) {
      const gen = gens[i]
      if (gen.type == _type) {
        // console.log(`generating ${_type} name`)
        // console.dir(gen)
        if (gen.hasOwnProperty("rule")) return useRule(gen)

        const first = (gen.first && gen.first.length > 0) ? gen.first[Math.floor(Math.random() * gen.first.length)] + ' ' : ''
        const last = (gen.last && gen.last.length > 0) ? gen.last[Math.floor(Math.random() * gen.last.length)] : ''
        return `${first}${last}`.trim()
      }
    }
  }
  return `NPC ${_type}`
}

module.exports = {
  newName: newName
}
