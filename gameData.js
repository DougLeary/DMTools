'use strict';

const fs = require('fs');
const path = require('path');
const { DisDB, DisDBError } = require('./disDB');
const classes = require('./classes');
const party = require('./party');

const TABLES = Object.freeze({
  systems: 'systems',
  editions: 'editions',
  classes: 'classes',
  parties: 'parties',
  members: 'members',
});

const TYPE_THING = 'Thing';
const TYPE_PC = 'PlayerCharacter';

let _db = null;
let _initialized = false;

function getDb() {
  if (!_db || !_db.connected) {
    throw new Error('gameData: DisDB not connected; call initialize() first');
  }
  return _db;
}

async function ensureTables(db) {
  for (const key of Object.keys(TABLES)) {
    const name = TABLES[key];
    try {
      await db.createTable(name, { privateChannel: true });
    } catch (e) {
      if (!(e instanceof DisDBError) || e.code !== 'TABLE_EXISTS') throw e;
    }
  }
}

function editionKey(systemName, editionName) {
  return `${String(systemName).toLowerCase()}|${String(editionName).toLowerCase()}`;
}

/**
 * Build nested systems[] tree (classes.json shape) from DisDB rows.
 */
function buildSystemsTree(systemRows, editionRows, classRows) {
  const systemsById = new Map();
  for (const r of systemRows) {
    const p = r.Props[0] || {};
    systemsById.set(r.Id, {
      _id: r.Id,
      name: r.Name,
      text: r.ShortDescription || '',
      editions: [],
      _order: p.order ?? 0,
    });
  }

  const editionNodeById = new Map();
  const editionsBySystemId = new Map();

  for (const r of editionRows) {
    const p = r.Props[0] || {};
    const systemId = p.systemId;
    if (!systemId || !systemsById.has(systemId)) continue;

    const effects = Array.isArray(p.effects) ? p.effects : [];
    const edObj = {
      name: r.Name,
      text: r.ShortDescription || '',
      effects,
      classes: [],
    };
    editionNodeById.set(r.Id, { edition: edObj, systemId, _order: p.order ?? 0 });
    if (!editionsBySystemId.has(systemId)) editionsBySystemId.set(systemId, []);
    editionsBySystemId.get(systemId).push({ editionId: r.Id, edition: edObj, _order: p.order ?? 0 });
  }

  for (const r of classRows) {
    const p = r.Props[0] || {};
    const editionId = p.editionId;
    const node = editionNodeById.get(editionId);
    if (!node) continue;

    const cls = {
      name: p.name || r.Name,
      hitDie: p.hitDie,
      bonusDie: p.bonusDie,
      maxHD: p.maxHD,
      thenHP: p.thenHP,
      levels: p.levels,
    };
    if (p.saves !== undefined) cls.saves = p.saves;
    if (p.saveAs !== undefined) cls.saveAs = p.saveAs;

    node.edition.classes.push(cls);
    const last = node.edition.classes[node.edition.classes.length - 1];
    last._order = p.order ?? 0;
  }

  for (const [, sys] of systemsById) {
    const list = editionsBySystemId.get(sys._id) || [];
    list.sort((a, b) => a._order - b._order);
    sys.editions = list.map((x) => x.edition);
    for (const ed of sys.editions) {
      ed.classes.sort((a, b) => (a._order ?? 0) - (b._order ?? 0));
      for (const c of ed.classes) delete c._order;
    }
  }

  const systems = [...systemsById.values()].sort((a, b) => (a._order ?? 0) - (b._order ?? 0));
  for (const s of systems) {
    delete s._order;
    delete s._id;
  }
  return systems;
}

async function migrateFromJsonFiles(db) {
  const classesPath = path.join(__dirname, 'data', 'classes.json');
  const partyPath = path.join(__dirname, 'data', 'party.json');

  const rawClasses = JSON.parse(fs.readFileSync(classesPath, 'utf8'));
  const systemsJson = rawClasses.systems;
  const partyJson = JSON.parse(fs.readFileSync(partyPath, 'utf8'));

  const systemIdByName = new Map();

  for (let si = 0; si < systemsJson.length; si++) {
    const sys = systemsJson[si];
    const rec = await db.createObject(TABLES.systems, {
      Type: TYPE_THING,
      Name: sys.name,
      ShortDescription: sys.text || '',
      Props: [{ order: si }],
    });
    systemIdByName.set(sys.name.toLowerCase(), rec.Id);
  }

  const editionIdByKey = new Map();

  for (const sys of systemsJson) {
    const systemId = systemIdByName.get(sys.name.toLowerCase());
    for (let ei = 0; ei < sys.editions.length; ei++) {
      const ed = sys.editions[ei];
      const props = { systemId, order: ei };
      if (Array.isArray(ed.effects) && ed.effects.length) props.effects = ed.effects;

      const rec = await db.createObject(TABLES.editions, {
        Type: TYPE_THING,
        Name: ed.name,
        ShortDescription: ed.text || '',
        Props: [props],
      });
      editionIdByKey.set(editionKey(sys.name, ed.name), rec.Id);

      for (let ci = 0; ci < ed.classes.length; ci++) {
        const cls = ed.classes[ci];
        const { name, hitDie, bonusDie, maxHD, thenHP, levels, saves, saveAs } = cls;
        const payload = { editionId: rec.Id, order: ci, name, hitDie, bonusDie, maxHD, thenHP, levels };
        if (saves !== undefined) payload.saves = saves;
        if (saveAs !== undefined) payload.saveAs = saveAs;

        await db.createObject(TABLES.classes, {
          Type: TYPE_THING,
          Name: name,
          ShortDescription: `${sys.name} — ${ed.name}`,
          Props: [payload],
        });
      }
    }
  }

  for (let pi = 0; pi < partyJson.length; pi++) {
    const p = partyJson[pi];
    const systemId = systemIdByName.get(String(p.system).toLowerCase());
    if (!systemId) {
      throw new Error(`migrate: unknown party.system "${p.system}" for party "${p.name}"`);
    }

    const partyRec = await db.createObject(TABLES.parties, {
      Type: TYPE_THING,
      Name: p.name,
      ShortDescription: p.system,
      Props: [{ systemId, xp: p.xp, order: pi }],
    });

    for (let mi = 0; mi < p.members.length; mi++) {
      const m = p.members[mi];
      const eid = editionIdByKey.get(editionKey(p.system, m.edition));
      if (!eid) {
        throw new Error(`migrate: no edition for party "${p.name}" member "${m.name}" edition "${m.edition}"`);
      }

      const { name, ...rest } = m;
      const props = { partyId: partyRec.Id, editionId: eid, order: mi, ...rest };

      await db.createObject(TABLES.members, {
        Type: TYPE_PC,
        Name: name,
        ShortDescription: '',
        Props: [props],
      });
    }
  }
}

async function loadPartiesFromDb(db) {
  const [partyRows, memberRows, systemRows, editionRows] = await Promise.all([
    db.getAllObjects(TABLES.parties),
    db.getAllObjects(TABLES.members),
    db.getAllObjects(TABLES.systems),
    db.getAllObjects(TABLES.editions),
  ]);

  const systemNameById = new Map();
  for (const r of systemRows) systemNameById.set(r.Id, r.Name);

  const editionNameById = new Map();
  for (const r of editionRows) {
    editionNameById.set(r.Id, { name: r.Name, systemId: (r.Props[0] || {}).systemId });
  }

  const membersByParty = new Map();
  for (const r of memberRows) {
    const p0 = r.Props[0] || {};
    const pid = p0.partyId;
    if (!pid) continue;
    if (!membersByParty.has(pid)) membersByParty.set(pid, []);
    membersByParty.get(pid).push({ row: r, props: p0 });
  }

  for (const [, arr] of membersByParty) {
    arr.sort((a, b) => (a.props.order ?? 0) - (b.props.order ?? 0));
  }

  partyRows.sort((a, b) => ((a.Props[0] || {}).order ?? 0) - ((b.Props[0] || {}).order ?? 0));

  const partiesOut = [];

  for (const pr of partyRows) {
    const p0 = pr.Props[0] || {};
    const systemId = p0.systemId;
    const systemName = systemNameById.get(systemId) || pr.ShortDescription || '';

    const bucket = membersByParty.get(pr.Id) || [];
    const members = [];

    for (const { row, props } of bucket) {
      const editionId = props.editionId;
      const meta = editionNameById.get(editionId);
      const editionName = meta ? meta.name : props.edition;

      const copy = { ...props };
      delete copy.partyId;
      delete copy.editionId;
      delete copy.order;

      const mem = {
        name: row.Name,
        ...copy,
        edition: editionName != null ? editionName : copy.edition,
      };
      mem._disDbId = row.Id;
      members.push(mem);
    }

    const partyObj = {
      name: pr.Name,
      system: systemName,
      xp: p0.xp != null ? p0.xp : 0,
      members,
      _disDbId: pr.Id,
    };
    partiesOut.push(partyObj);
  }

  party.importParties(partiesOut);
}

async function reloadClasses(db) {
  const [systemRows, editionRows, classRows] = await Promise.all([
    db.getAllObjects(TABLES.systems),
    db.getAllObjects(TABLES.editions),
    db.getAllObjects(TABLES.classes),
  ]);
  const tree = buildSystemsTree(systemRows, editionRows, classRows);
  classes.setSystems(tree);
}

function memberPropsForDb(mem, partyId, editionId, order) {
  const skip = new Set(['name', '_disDbId']);
  const payload = { partyId, editionId, order };
  for (const k of Object.keys(mem)) {
    if (skip.has(k)) continue;
    payload[k] = mem[k];
  }
  return payload;
}

async function persistPartyToDb(db, partyObj) {
  if (!partyObj._disDbId) {
    throw new Error('persistPartyToDb: party missing _disDbId');
  }

  const p0 = (await db.getObjectById(TABLES.parties, partyObj._disDbId)).Props[0] || {};
  const systemId = p0.systemId;
  const order = p0.order ?? 0;

  await db.updateObject(TABLES.parties, {
    Id: partyObj._disDbId,
    Type: TYPE_THING,
    Name: partyObj.name,
    ShortDescription: partyObj.system,
    Props: [{ systemId, xp: partyObj.xp, order }],
  });

  for (const mem of partyObj.members) {
    if (!mem._disDbId) continue;

    const prev = await db.getObjectById(TABLES.members, mem._disDbId);
    const prev0 = prev.Props[0] || {};
    const editionId = prev0.editionId;
    const ord = prev0.order ?? 0;

    const payload = memberPropsForDb(mem, partyObj._disDbId, editionId, ord);

    await db.updateObject(TABLES.members, {
      Id: mem._disDbId,
      Type: TYPE_PC,
      Name: mem.name,
      ShortDescription: '',
      Props: [payload],
    });
  }
}

/**
 * @param {{ loginToken: string, disdb?: { guildName: string, parentCategoryName?: string | null, tableChannelPrefix?: string } }} secret
 * @param {{ discordClient?: import('discord.js').Client }} [options] Pass discordClient from the bot so only one gateway connection is used.
 */
async function initialize(secret, options = {}) {
  if (_initialized) return;

  const guildName =
    (secret && secret.disdb && secret.disdb.guildName) ||
    process.env.DISDB_GUILD_NAME ||
    '';
  if (!guildName.trim()) {
    throw new Error(
      'gameData.initialize: set secret.disdb.guildName or environment variable DISDB_GUILD_NAME',
    );
  }

  const parentCategoryName =
    (secret && secret.disdb && secret.disdb.parentCategoryName) || process.env.DISDB_CATEGORY_NAME || null;

  const tableChannelPrefix =
    (secret && secret.disdb && secret.disdb.tableChannelPrefix) || process.env.DISDB_TABLE_PREFIX || undefined;

  const token = secret && secret.loginToken;
  if (!options.discordClient && (!token || typeof token !== 'string')) {
    throw new Error('gameData.initialize: secret.loginToken is required when discordClient is not provided');
  }

  try {
    _db = new DisDB();
    _db.initialize({
      guildName: guildName.trim(),
      parentCategoryName: parentCategoryName && String(parentCategoryName).trim() ? parentCategoryName : null,
      tableChannelPrefix,
    });

    if (options.discordClient) {
      await _db.attachClient(options.discordClient);
    } else {
      await _db.connect(token);
    }
    await ensureTables(_db);

    const existing = await _db.getAllObjects(TABLES.systems);
    if (existing.length === 0) {
      await migrateFromJsonFiles(_db);
    }

    await reloadClasses(_db);
    await loadPartiesFromDb(_db);

    party.setPersistHandler(async (pty) => {
      await persistPartyToDb(getDb(), pty);
    });

    _initialized = true;
  } catch (e) {
    party.setPersistHandler(null);
    if (_db) {
      try {
        await _db.disconnect();
      } catch (_) {
        /* ignore */
      }
      _db = null;
    }
    throw e;
  }
}

async function shutdown() {
  party.setPersistHandler(null);
  if (_db) {
    await _db.disconnect();
    _db = null;
  }
  _initialized = false;
}

function ready() {
  return _initialized;
}

module.exports = {
  TABLES,
  initialize,
  shutdown,
  ready,
  reloadClasses,
  getDb,
};
