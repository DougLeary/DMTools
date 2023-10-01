const data = require("./classLevels.json")

function getLevels(xp) {
  // for each class find the level corresponding to xp
  const list = []
  for (let e=0; e < data.editions.length; e++) {
    const ed = data.editions[e]
    for (let c=0; c < ed.classes.length; c++) {
      const _class = ed.classes[c]
      const levels = _class.levels
      const nLevels = levels.length

      let level = 0
      let xpToNext = 1      // XP to reach the next level (i.e. top of current level +1)
      let levelRange = 0    // XP per level, for levels above the table

      if (nLevels == 0) {
        // no levels for this class; this is a data error
        break
      } else if (nLevels == 1) {
        // use the one level value we have as levelRange and calculate the current level
        levelRange = levels[0]
        level = Math.floor(xp / levelRange) + 1
        xpToNext = levelRange * level + 1 - xp
        break
      } else {
        for (let i=0; i < nLevels; i++) {
          // found xp in the levels array 
          if (levels[i] > xp) {
            level = i+1
            xpToNext = levels[i] + 1 - xp
            break;
          } 
        }
        if (level == 0) {
          // xp is beyond the table
          levelRange = levels[nLevels-1] - levels[nLevels-2]
          const xpExcess = xp - levels[nLevels-1]
          const extraLevels = Math.floor(xpExcess / levelRange)
          level = nLevels + extraLevels
          xpToNext = levels[nLevels-1] + (extraLevels * levelRange) + 1 - (xpExcess % levelRange)
        }
      }

//      console.log(`xp=${xp}, level=${level}, xpToNext=${xpToNext}`)
      list.push({name: ed.name + " " + _class.name, level: level, xpToNext: xpToNext})
    }
  }
  return list
}

module.exports = {
  getLevels: getLevels
}