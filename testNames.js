const names = require('./names')

let st = names.newName('dwarf')
for (let i=1; i < 20; i++) {
  st += ', '
  st += names.newName('dwarf')
}
console.log(st)
