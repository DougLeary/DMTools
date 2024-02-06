const names = require('./names')

function test() {
  return names.newName('elf')
}

let st = test()
for (let i=1; i < 20; i++) {
  st += ', '
  st += test()
}
console.log(st)
