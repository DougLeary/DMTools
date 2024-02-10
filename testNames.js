const names = require('./names')

function test() {
  return names.getName('inn')
}

//console.log(names.getGenerators())
let st = test()
for (let i=1; i < 10; i++) {
  st += ', '
  st += test()
}
console.log(st)
