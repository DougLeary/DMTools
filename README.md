# DMTools
Tools for DMing 1st Edition AD&amp;D. Some of them work with .json files containing hand-entered data from AD&D books - currently the 1e Player's Handbook, Unearthed Arcana, and Oriental Adventures, which the software calls "editions". There is also an edition called "Custom" for things from Dragon Magazine, homebrew material, or whatever. 

## Available Tools ## 
1. Display class experience levels for an XP value, and how far it is to the next level.
2. Store character information for a party of adventurers, and level them up by adding XP. 
3. Display saving throws needed by a class and level, or roll a series of saving throws.
4. Roll a series of attacks by a THAC0 against an AC, showing hits and damage.
5. Name Generator-inator - an engine to run name generators encoded in JSON. 

These tools are meant to handle tedious DM gametime tasks. Rolling lots of dice is fun, but checking attack rolls and saving throws for dozens of creatures at a time is not fun. 
Rather than lookup and roll a lot of attacks or saving throws I tend to take shortcuts, which can sometimes trivialize encounters. So I wanted a handy tool that would resolve bunches of attacks or saves all at once, and show me the results in a way I could easily use. I also like to know where characters are in their levels, so when they are about to level up I can plan some memorable events to coincide with that. 

### Name Generator-inator ###
The most complicated tool here is an engine for creating name generators without coding. The engine itself is less than 50 lines of javascript, but it can generate names for anything - NPCs, towns, taverns, countries, swords, whatever, using name generation structures defined in a JSON file. Generators have type and flavor, for example "elf" and "female" or "inns" and "urban", so they can be sort of classified. The function *getGeneratorNames()* returns a list of all generators in the JSON file so a web page can display a selection list. The function *generate(type, flavor)* generates a name. Type and flavor are optional. 

Each generator consists of a small set of Blocks that contain tokens for building names, and a rule for applying the blocks. See names.json for sample generators.

#### Block ####
A string that starts with a 1-letter ID followed by a colon, and then a comma-separated list of name tokens. Example block that could represent the first part of a dwarven name: "A:Bor,Thon,Thon,Gron,...". Notice that "Thon" occurs more than once - this is to increase its odds of being picked. The block for the second part of the name could be "B:dar,don,gar,ial,olin...". 

##### Special Block Characters #####
**Pluralization**: handled by "+" and "*" after the 1-letter block ID. For example:

```
"A+:bunch of,dozens of,many"
"B*:huge,big,medium-size,little,tiny"
"C:rose,carnation,daisy"
```

"+"" pluralizes the block after the current block.
"*" postpones pluralization, if any, until the next block.

The above example would generate combinations like "bunch of daisies" and "dozens of little roses".

**Embedded Blocks**: to run a generator and insert the results in block text, simply use the generator name in curly braces {}. Example: the block

"A:{monetary treasure},{magic treasure}"

would return an item from the generator named "monetary treasure" or the generator named "magic treasure". You can use {generator-name} by itself or inserted within other text, such as "B:a sorceror's {wand},a magic {ring}".

#### Rule ####
A rule is a series of comma-separated steps for applying blocks. The rule for generating a name from blocks A and B here would have two steps: "A,B". This represents picking a token from block A and a token from block B, preserving capitalization. A sample result would be "Thonial". 

A more complicated generator would have a bunch of blocks and a more complex rule. For example, the rule "AAABC,D,E" has 3 steps: pick a token from block A, B or C, then from D, and finally from E. Repeating A 3x in the first step means it is 3x more likely to be used than B or C. 

##### Special Rule Characters #####
Hyphen '-' skips the current step, adding nothing to the name. For example, the step "C-" means pick from block C or skip this step, with equal odds. In step "C---" there is 3 out of 4 chance the step will be skipped.  
Period '.' stops the process and returns the result thus far. For example, the rule "AB,C.,D" will choose a token from block A or B, then half the time it will stop and half the time it will pick a token from block C and continue, using block D.  
Blank space at the beginning of a rule tells the engine to insert blanks between tokens. This is useful for generating multi-word names, such as tavern names or NPC first and last names. Other blanks in a rule are ignored.

Hyphens and periods can be combined for rudimentary flow control. Example: "A,...-,BC" means pick a token from block A, then 3 out of 4 times stop, but 1 out of 4 skip that step and continue, picking from block B or C. 

Arrangement of block IDs within a step does not matter. 

#### Multiple Rules ####
To choose between multiple naming patterns, a rule can be an array of strings instead of just one string. When this happens a random rule from the array is used. Repeating a rule in the array increases its odds of being used.  
Example: a tavern name generator with the simple rule “ A,B” could generate names with the pattern “Adjective Noun” as in “Happy Goblin”. To also create names with the pattern “Noun and Noun” such as "Dog and Pony" you could use a rule array like [“ A,B”, “ B,C,B”]. Block A would contain adjectives, B would contain nouns, and C would contain only the word " and".

The generator-inator turned out to be more versatile than I expected. It has let me whip up special-purpose name generators in a matter of minutes. Just one less detail to think about at game time, when players decide to Charm a group of nameless NPC bandits and use them as henchmen. 
