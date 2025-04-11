const party = require('./party')

const pName = "Baker Street Bakers"
const p = party.getParty(pName)

function formatName(member) {
    if (member.hide) return `(${member.name})`
    return member.name
}

console.log(pName)
console.log("------------------------------")
for (let m in p.members) {
    console.log(formatName(p.members[m]))
}
