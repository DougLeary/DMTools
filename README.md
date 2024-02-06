# DMTools
Tools for DMing 1st Edition AD&amp;D

These tools work with .json files containing hand-entered data from AD&D books - currently the 1e Player's Handbook, Unearthed Arcana, and Oriental Adventures, which are referred to internally as "editions". There is also an edition called "Custom" for things from Dragon, homebrew, or whatever. 

Tools available at the moment: 
1. Display class experience levels for an XP value, and how far it is to the next level.
2. Display saving throws needed by a class and level, or roll a series of saving throws.
3. Roll a series of attacks by a THAC0 against an AC, showing hits and damage.
4. Generate names for things using a JSON-based lexical generator.

This project was inspired by the tediousness of DMing a party against a group of creatures at once, like a squad of demons or a swarm of giant wasps. Rather than roll a lot of attacks or saving throws I tend to take shortcuts, which I think trivializes an encounter. So I wanted a handy tool that would let me resolve a bunch of attacks or saves all at once, and show me the results in a way I could easily use. I also like to know where characters are in their levels, so when they are about to level up I can plan for some interesting events that coincide with that. After figuring out the mechanics for classes generally, the next step is to maintain a party list with character stats and apply these same utilities to it. 

**Name Generator-inator** - a simple engine for creating name generators without coding. The engine itself is less than 50 lines of javascript, and it can generate names for anything - NPCs, towns, taverns, countries, swords, whatever, using name generation structures defined in a JSON file. A generator consists of a small set of building blocks and a rule for applying them. 

A block is a string that contains a 1-letter ID and a comma-separated list of name segments - for example, "A:Bor,Tho,Tho,Tho,Gron,Glor...". In that example "Tho" is repeated multiple times so it will be picked more often. This block could represent the first part of dwarf names. A second block could be "B:dar,don,ial,olin...". 

A rule is a series of comma-separated steps for applying the blocks. In a simple case where you just want to pick a beginning and ending piece from 2 blocks the rule would be just be "A,B". A more complicated scheme could have a bunch of blocks and the rule could choose between them. For example, the rule "AAABC,D,E" picks a segment from block A, B or C, then from D and finally from E. In the first step block A is 3x more likely to get picked than B or C. 

Special rule characters: 
A hyphen skips the current step. For example, in the step "C---" there is 1 out of 4 chance a segment will be chosen from block C, and 3 out of 4 chances the step will be skipped.
A period stops the process and returns the result thus far. For example, the rule "AB,C.,D" will choose a segment from block A or B, then half the time it will stop and half the time it will choose from C and continue to D.
Hyphens and periods can be combined for rudimentary flow control. Example: "A,.....-,BC" means do A, then 5 out of 6 times stop, but 1 out of 6 skip that step and go on to pick from B or C. 

The generator-inator turned out to be more versatile than I expected. I lets me whip up special-purpose generators in a matter of minutes that create names with consistent cultural flair. Just one less detail to think about at game time when players capture a group of nameless goblins and decide to ask their names. 
