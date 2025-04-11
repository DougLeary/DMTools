// DieRoll
//   { sides: <sides per die>, 
//     count: <number of dice>, 
//     modifier: <add or subtract>, 
//     keep: <how many highest to keep>
//   }
//
// To roll: instance.roll()
//   or     DieRoll.roll(sides, count, modifier, keep)
//   or     DieRoll.rollFromString("3d8+1")
//
// All roll methods return: 
//   { 
//      total: <final result>,
//      rolls: [<individual roll result>]
//   } 
function numToken (st, regExp, key, defaultValue) {
  let result = st.match(regExp);
  let value = (result) ? parseInt(result[0].replace(key, '')) : defaultValue;
  return (!isNaN(value)) ? value : defaultValue;
}

class DieRoll {
  static defaultDie = 20
  static parse(text) {
    // create a DieRoll object from a string, expected format: "4d6k3+1*100x5"
    // d6     6-sided dice
    // 4      roll 4 of them
    // k3     keep the highest 3
    // +1     add 1 to the total
    // *100   multiply the result by 100
    // TODO: add reroll (see Roll20 dice syntax) and add * multiplier
    
    // if "d" is missing treat text as a constant, defaulting to 0
    let st = text.toLowerCase().replace(/[^0123456789dk+-]+/gi, '')
    if (st.indexOf('d') < 0) {
      let i = parseInt(st)
      if (isNaN(i)) i = 0
      return new DieRoll( 0, 1, i)
    }
    
    // found "d" so parse the string as a die roll
    const sides = numToken(st, /d\d*/, 'd', 20)
    const count = numToken(st, /\d*d/, 'd', 1)
    const keep = numToken(st, /k\d*/, 'k', count)
    let modifier = numToken(st, /[+]\d*/, '+', 0)
    if (modifier == 0) modifier = -numToken(st, /[-]\d*/, '-', 0)
    const multiplier = numToken(st, /[*]\d*/, '*', 1)
    
    return new DieRoll(sides, count, modifier, keep, multiplier) 
  }
  
  /**
   * Perform a die roll and return results
   * 
   * @param {string} text - die roll string
   * @returns results structure { total: total rolled, rolls: [individual roll results]}
   */
  static roll(text) {
    return DieRoll.parse(text).roll()
  }

  /**
   * 
   * @param {number} sides 
   * @param {number} count 
   * @param {number} modifier 
   * @param {number} keep 
   * @param {number} multiplier 
   */
  constructor(sides=defaultDie, count=1, modifier=0, keep=count, multiplier=1) {
    this.sides = sides
    this.count = count
    this.modifier = modifier
    this.keep = keep
    this.multiplier = multiplier
  }

  /**
   * Perform the die roll once or a number of times.
   * @times  {number} how many times (default=1)
   * @returns   one result: { total: dice total, rolls: [individual dice]} or an array
   */
  roll(times=1) {
    // perform the die roll and return the total (minimum 0) and list of rolls
    if (times > 1) {
      const results = []
      for (let i=1; i<=times; i++) {
        results.push(this.roll())
      }
      return results
    }

    const rolls = []
    for (let i = 0; i < this.count; i++) {
      if (this.sides > 0) {
        rolls.push(Math.floor(Math.random() * (this.sides)) + 1)
      } else rolls.push(0)
    }
    // total up the ones we want to keep
    rolls.sort(function (a, b) { return b - a })   // descending order
    let total = 0
    for (let i = 0; i < this.keep; i++) {
      total += rolls[i]
    }
    // add modifier, keeping a minimum total of 0
    total = Math.max(total + this.modifier, 0) * this.multiplier

    return {
      total: total,
      rolls: rolls
    }
  }
  
  toString() {
    if (this.count > 0 && this.sides > 0) {
      return ((this.count > 1) ? this.count.toString() : "1") + "d" + this.sides.toString()
           + ((this.keep != this.count) ? "k" + this.keep : "")
           + ((this.modifier > 0) ? "+" : "")
           + ((this.modifier != 0) ? this.modifier.toString() : "")
    } else {
      return this.modifier.toString()
    }
  }

  min() {
    return Math.max(this.keep + this.modifier, 0)
  }

  max() {
    return this.keep * this.sides + this.modifier
  }

  range() {
    if (this.min() == this.max()) {
      return this.max().toString()
    } else {
      return this.min().toString() + "-" + this.max().toString()
    }
  }

}

module.exports = DieRoll