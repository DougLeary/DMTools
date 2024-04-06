const appName = "Dnd"
const express = require('express')
const path = require('path')
const classes = require('./classes')
const attack = require('./attacks')
const saves = require('./saves')
const names = require('./names')
const party = require('./party')

const app = express()
app.use(express.json())
app.use(express.static('.'))

// routing
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '/index.html'))
})

app.get('/editions', (req, res) => {
  // return names of known editions
  console.log('Edition names')
  const results = classes.getEditions()
  res.json(st)
})

app.get('/classes', (req, res) => {
  // return class names by edition
  console.log(`Get editions and classes`)
  const json = classes.getClasses()
//  console.log(`Returning ${JSON.stringify(json)}`)
  res.json(json)
})

app.get('/attack', (req, res) => {
  res.sendFile(path.join(__dirname, '/attack.html'))
})
app.get('/attack/:attacks/:thaco/:damage/:ac', (req, res) => {
  // roll a series of attacks against ac using thaco, return a string showing hits and damage
  console.log(`Attacks: ${req.params.attacks}, Thaco: ${req.params.thaco}, Damage: ${req.params.damage}, AC: ${req.params.ac}`)
  const st = attack.roll(req.params.attacks, req.params.thaco, req.params.damage, req.params.ac)
//  console.log(`Returning ${st}`)
  res.json(st)
})
app.get('/saves/:edition/:className/:level', (req, res) => {
  // return saving throws for an edition class and level
  console.log(`Saving throws for ${req.params.edition} ${req.params.className} level ${req.params.level}`)
  const json = saves.getSaves(req.params.edition, req.params.className, req.params.level)
//  console.log(`Returning ${JSON.stringify(json)}`)
  res.json(json)
})
app.get('/saves/:className/:level', (req, res) => {
  // return saving throws for a class and level, using the first class instance found across editions
  // TODO: probably should return results for ALL instances found, always returning an array
  console.log(`Saving throws for ${req.params.className} level ${req.params.level}`)
  const json = saves.getSaves(null, req.params.className, req.params.level)
//  console.log(`Returning ${JSON.stringify(json)}`)
  res.json(json)
})
app.get('/rollsaves/:saves/:edition/:className/:level', (req, res) => {
  // roll a series of saving throws for an edition class and level, and return how many saved against each thing
  console.log(`${req.params.saves} saving throws for ${req.params.className} level ${req.params.level}`)
  const json = saves.rollSaves(req.params.saves, req.params.edition, req.params.className, req.params.level)
//  console.log(`Returning ${JSON.stringify(json)}`)
  res.json(json)
})

app.get('/levels', (req, res) => {
  res.sendFile(path.join(__dirname, '/levels.html'))
})

app.get('/classlevels/:xp', (req, res) => {
  // display a list of classes and the level the XP value corresponds to in each
  console.log(`Get levels for XP: ${req.params.xp}`)
  const json = classes.getAllLevels(req.params.xp)
//  console.log(`Returning ${JSON.stringify(json)}`)
  res.json(json)
})

app.get('/partylevels/:partyname/:xp', (req, res) => {
  // display party member levels for xp; if 0 xp use party xp
  const xp = req.params.xp
  console.log(`Get party levels for ${(xp > 0) ? xp : 'stored'} xp`)
  const pty = party.getParty(req.params.partyname)
  const json = party.getPartyLevels(pty, req.params.xp || 0)
//  console.log(`Returning ${JSON.stringify(json)}`)
  res.json(json)
})

app.get('/partynames', (req, res) => {
  // return array of available party names
  console.log(`Get party names`)
  const arr = party.getPartyNames()
//  console.log(`Returning ${JSON.stringify(arr)}`)
  res.json(arr)
})

app.get('/names', (req, res) => {
  res.sendFile(path.join(__dirname, '/names.html'))
})
app.get('/names/types', (req, res) => {
  const json = names.getGenerators()
  res.json(json)
})

app.get('/names/:count/:type/:flavor', (req, res) => {
  // return a random name with type and flavor
  console.log(`api for ${req.params.flavor} ${req.params.type}`)
  const json = []
  for (let i=0; i<req.params.count; i++) {
    json.push(names.getName(req.params.type, req.params.flavor))
  }
  res.json(json)
})

app.get('/names/:count/:type', (req, res) => {
  // return a random name of a given type (elf, dwarf, inn...)
  const json = []
  for (let i=0; i<req.params.count; i++) {
    json.push(names.getName(req.params.type))
  }
  res.json(json)
})

const nodeJsPorts = (process.env.node_js_ports ? JSON.parse(process.env.node_js_ports) : [])
if (nodeJsPorts) {
  const now = new Date()
  console.log(`Starting ${appName} server    ${now.toDateString()} ${now.toTimeString().substring(0,8)}`)
  const port = nodeJsPorts[appName] || 3000
  app.listen(port, () => console.log(`============= Listening on port ${port} ==============`))
} else {
  app.listen() 
}
