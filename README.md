# DMTools
Tools for DMing 1st Edition AD&amp;D. Some of them work with .json files containing hand-entered data from AD&D books - currently the 1e Player's Handbook, Unearthed Arcana, and Oriental Adventures, which the software calls "editions". There is also an edition called "Custom" for things from Dragon, homebrew, or whatever. 

### Notes on V0.1
This branch constitutes version 0.1, which works in a limited but fairly usable state aimed mainly at AD&D version 1e, including character classes from the Player's Handbook, Unearthed Arcana and Oriental Adventures. These books were copyrighted by TSR Inc. in the 1970s and 80s. The code in this project contains no copyrighted material, only numerical values and the operating concepts used by a Dungeon Master to perform calculations while running a game. The code uses data in two JSON files: 

- Classes.json - static data about level advancement and saving throws. 
- Party.json - data about parties and their member characters. 

The code was written to suit the needs of a specific gaming group that awards the same XP to all members of an adventuring party. That XP value, stored in party.json, is used to compute the level of each character based on the leveling tables in classes.json.
To award experience for a game session it is necessary to manually edit the xp value for the party in party.json and restart the node app, which reads the json files once at startup. 

The books mentioned are referred to in the code as "editions", abbreviated 1e, UA and OE. A party member can have one or multiple classes. Multiple classes, which must be from a single edition, are separated with slashes as in "Fighter/Thief". Split classes and Bards are not handled in this version. A character's XP are assumed to be divided equally between classes. Individual variations in XP among characters are also not handled. Everybody gets the XP defined for the party. 

In classes.json the hazards that correspond to Saving Throws (Breath Weapon, Spell, etc.) are defined for 1e and used by the other "editions". A class either has a list of saving throw values that correspond to those hazards, or a "saveAs" property that 
specifies the class whose saving throw values should be used. Classes.json also contains an incomplete list of OSE (Old School Essentials) classes, their hazards and saving throws, but saving throw functionality is not tested for OSE, and probably doesn't work.
The definition of hazards really belongs at a Game System level to get proper separation. This and other improvements are planned for the next version, which will require a fair amount of reorganization of the JSON structure and is why I decided to declare the current code as v0.1. 

## Available Tools ## 
1. Display class experience levels for an XP value, or party member levels based on stored party XP.
2. Display saving throws needed by a class and level, or roll a series of saving throws.
3. Roll a series of attacks by a THAC0 against an AC, showing hits and damage.
4. Name Generator-inator - engine to create name generators.

These tools are meant to handle tedious DM gametime tasks. Rolling lots of dice is fun, but checking attack rolls and saving throws for dozens of creatures at a time is not fun. 
 than roll a lot of attacks or saving throws I tend to take shortcuts, which I think trivializes an encounter. So I wanted a handy tool that would let me resolve a bunch of attacks or saves all at once, and show me the results in a way I could easily use. I also like to know where characters are in their levels, so when they are about to level up I can plan for some interesting events that coincide with that. After figuring out the mechanics for classes generally, the next step is to maintain a party list with character stats and apply these same utilities to it. 

### Name Generator-inator ###
The most complicated tool here is an engine for creating name generators without coding. The engine itself is less than 50 lines of javascript, but it can generate names for anything - NPCs, towns, taverns, countries, swords, whatever, using name generation structures defined in a JSON file. Generators have type and flavor, for example "elf" and "female" or "inns" and "urban", so they can be sort of classified. The function *getGenerators()* returns a list of all generators in the JSON file so a web page can display a selection list. The function *getName(type, flavor)* generates a name. 

Each generator consists of a small set of Blocks that contain tokens for building names, and a rule for applying the blocks. See names.json for sample generators.

#### Block ####
A string that starts with a 1-letter ID followed by a colon, and then a comma-separated list of name tokens. Example block that could represent the first part of a dwarven name: "A:Bor,Thon,Thon,Gron,...". Notice that "Thon" occurs more than once - this is to increase its odds of being picked. The block for the second part of the name could be "B:dar,don,gar,ial,olin...". 

#### Rule ####
A rule is a series of comma-separated steps for applying blocks. The rule for generating a name from blocks A and B here would have two steps: "A,B". This represents picking a token from block A and a token from block B, preserving capitalization. A sample result would be "Thonial". 

A more complicated generator would have a bunch of blocks and a more complex rule. For example, the rule "AAABC,D,E" has 3 steps: pick a token from block A, B or C, then from D, and finally from E. Repeating A 3x in the first step means it is 3x more likely to be used than B or C. 

#### Special Rule Characters ####
A hyphen '-' skips the current step, adding nothing to the name. For example, the step "C-" means pick from block C or skip this step, with equal odds. In step "C---" there is 3 out of 4 chance the step will be skipped.  
A period '.' stops the process and returns the result thus far. For example, the rule "AB,C.,D" will choose a token from block A or B, then half the time it will stop and half the time it will pick a token from block C and continue, using block D.  
A blank space at the beginning of a rule tells the engine to insert blanks between tokens. This is useful for generating multi-word names, such as tavern names or NPC first and last names. Other blanks in a rule are ignored.

Hyphens and periods can be combined for rudimentary flow control. Example: "A,...-,BC" means pick a token from block A, then 3 out of 4 times stop, but 1 out of 4 skip that step and continue, picking from block B or C. 

Arrangement of block IDs within a step does not matter. 

#### Multiple Rules ####
To choose between multiple naming patterns, a rule can be an array of strings instead of just one string. When this happens a random rule from the array is used. Repeating a rule in the array increases its odds of being used.  
Example: a tavern name generator with the simple rule “ A,B” could generate names with the pattern “Adjective Noun” as in “Happy Goblin”. To also create names with the pattern “Noun and Noun” such as "Dog and Pony" you could use a rule array like [“ A,B”, “ B,C,B”]. Block A would contain adjectives, B would contain nouns, and C would contain only the word " and".

The generator-inator turned out to be more versatile than I expected. It has let me whip up special-purpose name generators in a matter of minutes. Just one less detail to think about at game time, when players decide to Charm a group of nameless NPC bandits and use them as henchmen. 
