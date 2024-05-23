const partyFilename = './data/party.json'
let parties = require(partyFilename)
const classes = require("./classes")
const fs = require('fs')
const Actions = { set:"set", add:"add" }

function eq(str1, str2) {
  return (String(str1).toLowerCase() == String(str2).toLowerCase())
}

function getPartyNames() {
  const arr = []
  parties.forEach((party) => { arr.push(party.name) })
  return arr
}

function getParty(name) {
  let result = null
  parties.forEach((party) => { 
    if (eq(party.name, name)) { result = party }
  })
  return result
}

function getPartyMember(party, memberName) {
  for (let member in party.members) {
    if (eq(member.name, memberName)) { return member }
  }
  return null
}

function savePartyData() {
  const result = {success: true}
  try {
    fs.writeFileSync(partyFilename, JSON.stringify(parties, null, 2), 'utf8')
    console.log(`${partyFilename} updated`)
  } catch (error) {
    console.log(`Error writing file ${partyFilename}`)
    result.success = false
  }
  return result
}

function reload() {
  parties = require(".classes")
}

function updateMemberXp(action, party, member, xp, toClass = null) {
  console.log(`MemberXp(${party.name}, ${member.name}, ${xp}, ${toClass}`)
  // internal function to add xp to a whole party (divided between active members),
  // or to a single member (divided between their classes), or optionally to one of a member's classes
  if (!member || isNaN(xp) || member.hide) return false
  if (member.boss) {
    // henchman; set levels = boss's lowest level-2; henchman cannot be split-class
    let minBossLevel = 99999
    // find the boss and get their lowest level
    party.members.forEach((mem) => {
      if (eq(mem.name, member.boss)) {
        mem.classes.forEach((cls) => {
          minBossLevel = Math.min(minBossLevel, cls.level)
        })
      }
    })
    member.classes.forEach((cls) => {
      cls.xp = 0
      cls.level = minBossLevel - 2
      cls.xpToNext = 0
    })
  } else if (member.splitClass) {
    // add xp to split class only
    let classXp = xp / 1
    member.classes.forEach((cls) => {
      if (eq(cls.name, member.splitClass)) {
        // if toClass is given it can only be the split class
        if (!toClass || eq(cls.name, toClass)) {
          console.log(`${member.name}  ${cls.name}  adding ${classXp}`)
          if (action == Actions.add) {
            cls.xp += (cls.getsBonus) ? Math.round(classXp * 1.1) : classXp
          } else {
            cls.xp = (cls.getsBonus) ? Math.round(classXp * 1.1) : classXp
          }
          const obj = classes.getCharacterLevel(party.system, member.edition, cls.name, cls.xp)
          cls.level = obj.level
          cls.xpToNext = cls.getsBonus ? Math.floor(obj.xpToNext / 1.1) : obj.xpToNext
        }
      }
    })
  } else {
    // divide xp between classes or add entirely to toClass
    let classXp = (toClass) ? xp / 1 : Math.round(xp / member.classes.length)
    member.classes.forEach((cls) => {
      if (!toClass || eq(cls.name, toClass)) {
        const prevXp = cls.xp
        if (action == Actions.add) {
          cls.xp += (cls.getsBonus) ? Math.round(classXp * 1.1) : classXp
        } else {
          cls.xp = (cls.getsBonus) ? Math.round(classXp * 1.1) : classXp
        }
        const obj = classes.getCharacterLevel(party.system, member.edition, cls.name, cls.xp)
        cls.level = obj.level
        cls.xpToNext = cls.getsBonus ? Math.floor(obj.xpToNext / 1.1) : obj.xpToNext
      }
    })
  }
  return true
}

function updatePartyXp(action, party, xp) {
  // add to the common party xp and add a share to all members, +10% bonus for those who get it
  if (!party || isNaN(xp) || !xp) return false
  // determine member share
  let shares = 0
  party.members.forEach((member) => {
    if (!member.hide) shares++ 
  })
  const memberXp = Math.round(xp / shares)

  let ok = true
  party.members.forEach((member) => {
    if (!member.hide) { ok = ok && updateMemberXp(action, party, member, memberXp) }
  }) 
  if (!ok) return false     // to do: if one update fails roll back those that have succeeded, otherwise we leave member xp in a weird state 

  if (action == Actions.add) {
    party.xp = parseInt(party.xp) + parseInt(xp)
  } else {
    party.xp = parseInt(xp)
  }
  
  return true
}

function updateXp(action, xp, party, member = null, toClass = null) {
  // update member xp or party xp, saving JSON if successful
  if (member) {
    return updateMemberXp(action, xp, party, member, toClass) && savePartyData()
  }
  return updatePartyXp(action, xp, party) && savePartyData()
}

function getPartyLevels(party, showHidden) {
  // return each party member's name, class/class/..., level/level/..., xpToNext/xpToNext/...
  console.log(`getPartyLevels, ${showHidden ? "" : "don't "}show hidden`)
  const result = {name: party.name, xp: party.xp, members: []}
  party.members.forEach((mem) => {
    if (showHidden || !mem.hasOwnProperty("hide")) {
      const member = {name: mem.name, classes: "", levels: "", xpToNext: ""}
      if (mem.splitClass) {
        mem.classes.forEach((cls) => {
          if (cls.name == mem.splitClass) {
            member.classes = cls.name
            member.levels = String(cls.level)
            member.xpToNext = String(cls.xpToNext)
          }
        })
      } else {
        if (mem.hasOwnProperty("boss")) {
          // henchman; report all class levels as their boss's lowest level - 2
          member.boss = mem.boss
          let minBossLevel = 99999
          // find the boss and get their lowest level
          party.members.forEach((boss) => {
            if (eq(boss.name, member.boss)) {
              boss.classes.forEach((cls) => {
                minBossLevel = Math.min(minBossLevel, cls.level)
              })
            }
          })
          mem.classes.forEach((cls) => {
            // separate class props with /
            member.classes += `${cls.name}/`
            member.levels += `${minBossLevel - 2}/`
            member.xpToNext = ''
          })
        } else {
          // multiclass character
          mem.classes.forEach((cls) => {
            // separate class props with /
            member.classes += `${cls.name}/`
            member.levels += `${cls.level}/`
            member.xpToNext += `${cls.xpToNext} / `
            console.log(`${member.name} class #{cls.name} xptoNext: ${cls.xpToNext}, reporting ${member.xpToNext}`)
          })
        }
        // remove trailing /
        member.classes = member.classes.substring(0, member.classes.length-1)
        member.levels = member.levels.substring(0, member.levels.length-1)
        member.xpToNext = member.xpToNext.substring(0, member.xpToNext.length-3)
      }
      result.members.push(member)
    }
  })
  return result
}

module.exports = {
  Actions,
  getParty,
  getPartyNames,
  getPartyLevels,
  updateXp,
  reload
}
