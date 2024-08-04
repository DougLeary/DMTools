function singularOf(text) {
  // look for embedded prepositions: "cups of coffee" --> "cup of coffee"
  const preps = [' of ', ' in ', ' on ', ' at ', ' for ', ' from ', ' to ', ' with ', ' without ']
  for (let i=0; i<preps.length; i++) {
    const token = preps[i]
    const arr = `${text} `.split(token)
    if (arr.length > 1) {
      return singularOf(arr[0]) + token + arr[1]
    }
  }

  // modifiers: as in "arrows +1 --> arrow +1"
  if (/s*(\+|\-)\d+$/.test(text)) {
    const arr = text.split(/(?=(\s(\+|\-)\d+))/)
    return singularOf(arr[0]) + arr[1]
  }

  // explicit pluralization: "[text|plural]"" --> "plural"
  let pattern = /s*\[[a-z ]*\|[a-z ]*\]/i
  //    const pattern = /s*\[[a-z ]\]/i
  let p = pattern.exec(text);
  if (p) {
    const token = /\[[a-z ]*\|/i.exec(text);
    const singular = token[0].toString().substring(1,token[0].length-1)
      // empty [] means plural is the same as singular, just remove []
    if (singular == "") singular = text.substring(0,text.length-2)
      // otherwise replace word with singular
    const st = p[0].substring(0, p[0].length);
    return text.replace(st, singular)
  }
  
  // plural same as singular
  pattern = /\[[a-z ]*\]/i
  p = pattern.exec(text)
  if (p) {
    const token = /\[[a-z ]*\]/i.exec(text)
    const singular = token[0].toString().substring(1,token[0].length-1)
    if (singular == "") singular = text.substring(0,text.length-2)
      // otherwise replace word with singular
    const st = p[0].substring(0, p[0].length);
    return text.replace(st, singular)
  }

  // "ies" for words that end in y after a consonant
  if (/[bcdfghjklmnpqrstvwxyz]ies$/.test(text)) {
    return text.substring(0, text.length - 3) + "y"
  }

  // "es" rules
  if (/(x|ch|sh|ss)es$/.test(text)) {
    return text.substring(0, text.length - 2)
  }

  // "s" ending
  if (/[a-z]*s$/.test(text)) {
    return text.substring(0, text.length - 1)
  }

  // default
  return text
} 

function pluralOf(text) {
  // prepositions: Potion of Healing --> Potions of Healing
  const preps = [' of ', ' in ', ' on ', ' at ', ' for ', ' from ', ' to ', ' with ', ' without ']
  for (let i=0; i<preps.length; i++) {
    const token = preps[i]
    const arr = `${text} `.split(token)
    if (arr.length > 1) {
      return pluralOf(arr[0]) + token + arr[1]
    }
  }

  // modifiers: Arrow +1 --> Arrows +1
  if (/s*(\+|\-)\d+$/.test(text)) {
    const arr = text.split(/(?=(\s(\+|\-)\d+))/)
    return pluralOf(arr[0]) + arr[1]
  }

  // explicit pluralization: "[text|plural]"" --> "plural"
  let pattern = /s*\[[a-z ]*\|[a-z ]*\]/i
  //    const pattern = /s*\[[a-z ]\]/i
  let p = pattern.exec(text);
  if (p) {
    const token = /\|[a-z ]*\]/i.exec(text);
    const plural = token[0].toString().substring(1,token[0].length-1)
      // empty [] means plural is the same as singular, just remove []
    if (plural == "") plural = text.substring(0,text.length-2)
      // otherwise replace word with plural
    const st = p[0].substring(0, p[0].length);
    return text.replace(st, plural)
  }
  
  // plural same as singular
  pattern = /\[[a-z ]*\]/i
  p = pattern.exec(text)
  if (p) {
    const token = /\[[a-z ]*\]/i.exec(text)
    const plural = token[0].toString().substring(1,token[0].length-1)
    if (plural == "") plural = text.substring(0,text.length-2)
      // otherwise replace word with plural
    const st = p[0].substring(0, p[0].length);
    return text.replace(st, plural)
  }

  // "ies" for words that end in y after a consonant
  if (/[bcdfghjklmnpqrstvwxyz]y$/.test(text)) {
    return text.substring(0, text.length - 1) + "ies"
  }

  // "es" rules
  if (/(x|ch|sh|ss)$/.test(text)) {
    return text + "es"
  }

  // default
  return text + "s"
}


module.exports = { 
  singularOf,
  pluralOf
}

