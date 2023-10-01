const appName = "Dnd"
const express = require('express')
const path = require('path')
const attack = require('./attack')
const levels = require('./classLevels')
const saves = require('./saves')

const app = express()
app.use(express.json())
app.use(express.static('.'))

// routing
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '/dnd.html'))
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
app.get('/levels/:xp', (req, res) => {
  // display a list of classes and the level the XP value corresponds to in each
  console.log(`Levels for XP: ${req.params.xp}`)
  const json = levels.getLevels(req.params.xp)
//  console.log(`Returning ${JSON.stringify(json)}`)
  res.json(json)
})

if (process.env.node_js_ports) {
  const nodeJsPorts = JSON.parse(process.env.node_js_ports)
  console.log("App Name:", appName, " Env Port:", nodeJsPorts[appName])
  const port = nodeJsPorts[appName] || 3000  // env variable or default
  app.listen(port, () => console.log(`================== Listening on port ${port} ===================`))
} else {
  app.listen() 
}
