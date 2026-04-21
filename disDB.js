'use strict';

const crypto = require('crypto');
const {
  Client,
  Events,
  GatewayIntentBits,
  Partials,
  ChannelType,
  PermissionFlagsBits,
} = require('discord.js');

const DEFAULT_TABLE_PREFIX = 'disdb-';

const OBJECT_TYPES = new Set([
  'PlayerCharacter',
  'NonplayerCharacter',
  'Creature',
  'MagicItem',
  'Thing',
]);

/** @param {string} type */
function canonicalObjectType(type) {
  if (typeof type !== 'string' || !type.trim()) return null;
  const lower = type.trim().toLowerCase();
  for (const t of OBJECT_TYPES) {
    if (t.toLowerCase() === lower) return t;
  }
  return null;
}

function sanitizeChannelSegment(name) {
  return String(name)
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-_]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 80);
}

function normalizeTableKey(tableName) {
  const s = sanitizeChannelSegment(tableName);
  if (!s) throw new DisDBError('INVALID_TABLE_NAME', 'Table name is empty or invalid after sanitization');
  return s;
}

function channelNameForTable(prefix, tableKey) {
  const p = prefix.endsWith('-') ? prefix.slice(0, -1) : prefix;
  return `${p}-${tableKey}`.slice(0, 100);
}

class DisDBError extends Error {
  constructor(code, message, details) {
    super(message);
    this.name = 'DisDBError';
    this.code = code;
    if (details !== undefined) this.details = details;
  }
}

function newTableState(channelId) {
  return {
    channelId,
    byId: new Map(),
    byType: new Map(),
    byName: new Map(),
  };
}

function indexRecord(state, messageId, record) {
  const id = record.Id;
  state.byId.set(id, { messageId, record });

  if (!state.byType.has(record.Type)) state.byType.set(record.Type, new Set());
  state.byType.get(record.Type).add(id);

  const nameKey = String(record.Name).toLowerCase();
  if (!state.byName.has(nameKey)) state.byName.set(nameKey, new Set());
  state.byName.get(nameKey).add(id);
}

function unindexRecord(state, record) {
  const id = record.Id;
  state.byId.delete(id);

  const typeSet = state.byType.get(record.Type);
  if (typeSet) {
    typeSet.delete(id);
    if (typeSet.size === 0) state.byType.delete(record.Type);
  }

  const nameKey = String(record.Name).toLowerCase();
  const nameSet = state.byName.get(nameKey);
  if (nameSet) {
    nameSet.delete(id);
    if (nameSet.size === 0) state.byName.delete(nameKey);
  }
}

async function fetchAllMessages(channel) {
  const byId = new Map();
  let before = undefined;
  for (;;) {
    const batch = await channel.messages.fetch({ limit: 100, before });
    if (batch.size === 0) break;
    for (const m of batch.values()) byId.set(m.id, m);
    const oldestId = [...batch.keys()].reduce((min, id) => (id < min ? id : min));
    before = oldestId;
    if (batch.size < 100) break;
  }
  return [...byId.values()].sort((a, b) => (a.id < b.id ? -1 : 1));
}

/**
 * Discord-backed JSON object store.
 * One guild text channel per table; each row is one message (raw JSON body).
 */
class DisDB {
  constructor() {
    this._client = null;
    /** When true, disconnect() does not destroy the Discord client (managed elsewhere). */
    this._externalClient = false;
    this._guildName = null;
    this._parentCategoryName = null;
    this._tablePrefix = DEFAULT_TABLE_PREFIX;
    this._guild = null;
    this._parentCategoryId = null;
    this._tables = new Map();
    this._channelIdToTableKey = new Map();
    this._listenersBound = false;
  }

  /**
   * @param {{ guildName: string, parentCategoryName?: string | null, tableChannelPrefix?: string }} options
   */
  initialize(options) {
    if (!options || typeof options.guildName !== 'string' || !options.guildName.trim()) {
      throw new DisDBError('INVALID_OPTIONS', 'initialize() requires { guildName: string }');
    }
    this._guildName = options.guildName.trim();
    this._parentCategoryName =
      options.parentCategoryName == null ? null : String(options.parentCategoryName).trim() || null;
    this._tablePrefix =
      typeof options.tableChannelPrefix === 'string' && options.tableChannelPrefix.trim()
        ? options.tableChannelPrefix.trim()
        : DEFAULT_TABLE_PREFIX;
    if (!this._tablePrefix.endsWith('-')) this._tablePrefix += '-';
  }

  /**
   * @param {string} token Discord bot token
   */
  async connect(token) {
    if (!this._guildName) {
      throw new DisDBError('NOT_INITIALIZED', 'Call initialize() before connect()');
    }
    if (!token || typeof token !== 'string') {
      throw new DisDBError('INVALID_TOKEN', 'connect() requires a bot token string');
    }
    if (this._client) {
      throw new DisDBError('ALREADY_CONNECTED', 'Already connected; disconnect() first');
    }

    this._externalClient = false;

    const client = new Client({
      intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
      ],
      partials: [Partials.Channel, Partials.Message],
    });

    this._client = client;
    await client.login(token);

    await this._waitUntilClientReady(client);

    await this._hydrateGuildAndTables();
  }

  /**
   * Bind to an existing logged-in Client (e.g. the bot's main client) so only one gateway connection is used.
   * Call initialize() first. The caller must keep the client alive; disconnect({ destroyClient: false }) is default when external.
   * @param {import('discord.js').Client} client
   */
  async attachClient(client) {
    if (!this._guildName) {
      throw new DisDBError('NOT_INITIALIZED', 'Call initialize() before attachClient()');
    }
    if (this._client) {
      throw new DisDBError('ALREADY_CONNECTED', 'Already connected; disconnect() first');
    }
    if (!client || typeof client.login !== 'function') {
      throw new DisDBError('INVALID_CLIENT', 'attachClient() requires a discord.js Client');
    }
    this._client = client;
    this._externalClient = true;
    await this._waitUntilClientReady(client);
    await this._hydrateGuildAndTables();
  }

  async _waitUntilClientReady(client) {
    if (client.isReady) return;
    await new Promise((resolve, reject) => {
      const t = setTimeout(
        () => reject(new DisDBError('READY_TIMEOUT', 'Client did not become ready in time')),
        60_000,
      );
      client.once(Events.ClientReady, () => {
        clearTimeout(t);
        resolve();
      });
      client.once('error', (err) => {
        clearTimeout(t);
        reject(err);
      });
    });
  }

  async _hydrateGuildAndTables() {
    const client = this._client;
    const matches = client.guilds.cache.filter((g) => g.name === this._guildName);
    if (matches.size === 0) {
      await this.disconnect();
      throw new DisDBError('GUILD_NOT_FOUND', `No guild named "${this._guildName}" (bot must be a member)`);
    }
    if (matches.size > 1) {
      await this.disconnect();
      throw new DisDBError(
        'AMBIGUOUS_GUILD',
        `Multiple guilds named "${this._guildName}"; rename one or extend DisDB to accept guild id`,
        { guildIds: [...matches.keys()] },
      );
    }
    this._guild = matches.first();
    await this._guild.channels.fetch();

    if (this._parentCategoryName) {
      const cat = this._guild.channels.cache.find(
        (c) => c.type === ChannelType.GuildCategory && c.name === this._parentCategoryName,
      );
      if (!cat) {
        await this.disconnect();
        throw new DisDBError(
          'CATEGORY_NOT_FOUND',
          `Category "${this._parentCategoryName}" not found in guild "${this._guildName}"`,
        );
      }
      this._parentCategoryId = cat.id;
    } else {
      this._parentCategoryId = null;
    }

    this._tables.clear();
    this._channelIdToTableKey.clear();

    const prefix = this._tablePrefix;
    for (const ch of this._guild.channels.cache.values()) {
      if (ch.type !== ChannelType.GuildText) continue;
      if (!ch.name.startsWith(prefix)) continue;
      const suffix = ch.name.slice(prefix.length);
      if (!suffix) continue;
      const tableKey = suffix;
      await this._registerTableChannel(tableKey, ch);
    }

    this._bindGatewayHandlers();
  }

  /**
   * @param {{ destroyClient?: boolean }} [options] When destroyClient is false and the client was attached externally, the client is not destroyed.
   */
  async disconnect(options = {}) {
    const destroy = options.destroyClient !== false && !this._externalClient;
    if (this._client) {
      this._unbindGatewayHandlers();
      if (destroy) {
        this._client.destroy();
      }
      this._client = null;
    }
    this._externalClient = false;
    this._guild = null;
    this._parentCategoryId = null;
    this._tables.clear();
    this._channelIdToTableKey.clear();
  }

  get connected() {
    return Boolean(this._client?.isReady?.());
  }

  /** @returns {string[]} */
  listTables() {
    return [...this._tables.keys()].sort();
  }

  /**
   * Creates a new table as a text channel under the configured guild (and category, if set).
   * @param {string} tableName Logical table name (e.g. "npcs")
   * @param {{ privateChannel?: boolean }} [options] When privateChannel is true (default), @everyone cannot view the channel and only the bot is granted access.
   */
  async createTable(tableName, options = {}) {
    this._requireReady();
    const tableKey = normalizeTableKey(tableName);
    if (this._tables.has(tableKey)) {
      throw new DisDBError('TABLE_EXISTS', `Table "${tableKey}" already exists`);
    }

    const name = channelNameForTable(this._tablePrefix, tableKey);
    const existing = this._guild.channels.cache.find((c) => c.type === ChannelType.GuildText && c.name === name);
    if (existing) {
      throw new DisDBError('CHANNEL_NAME_COLLISION', `A channel named "${name}" already exists`);
    }

    const privateChannel = options.privateChannel !== false;
    const createPayload = {
      name,
      type: ChannelType.GuildText,
      parent: this._parentCategoryId ?? undefined,
      reason: 'DisDB createTable',
    };
    if (privateChannel) {
      createPayload.permissionOverwrites = [
        {
          id: this._guild.roles.everyone.id,
          deny: [PermissionFlagsBits.ViewChannel],
        },
        {
          id: this._client.user.id,
          allow: [
            PermissionFlagsBits.ViewChannel,
            PermissionFlagsBits.SendMessages,
            PermissionFlagsBits.ReadMessageHistory,
            PermissionFlagsBits.ManageMessages,
          ],
        },
      ];
    }

    const ch = await this._guild.channels.create(createPayload);

    await this._registerTableChannel(tableKey, ch);
    return { tableKey, channelId: ch.id, channelName: ch.name };
  }

  /**
   * Deletes the table channel and drops cached indexes for that table.
   * @param {string} tableName
   */
  async deleteTable(tableName) {
    this._requireReady();
    const tableKey = normalizeTableKey(tableName);
    const state = this._tables.get(tableKey);
    if (!state) throw new DisDBError('TABLE_NOT_FOUND', `Unknown table "${tableKey}"`);

    const ch = await this._client.channels.fetch(state.channelId);
    await ch.delete('DisDB deleteTable');
    this._tables.delete(tableKey);
    this._channelIdToTableKey.delete(state.channelId);
  }

  /**
   * @param {string} tableName
   * @param {{ Type: string, Name: string, ShortDescription: string, Props?: unknown[] }} data Id optional (generated)
   */
  async createObject(tableName, data) {
    this._requireReady();
    const tableKey = normalizeTableKey(tableName);
    const state = this._tables.get(tableKey);
    if (!state) throw new DisDBError('TABLE_NOT_FOUND', `Unknown table "${tableKey}"`);

    const record = this._validatePayload({ ...data, Id: data.Id ?? crypto.randomUUID() }, true);
    if (state.byId.has(record.Id)) {
      throw new DisDBError('ID_CONFLICT', `Id "${record.Id}" already exists in table "${tableKey}"`);
    }

    const ch = await this._client.channels.fetch(state.channelId);
    const content = JSON.stringify(record);
    if (content.length > 2000) {
      throw new DisDBError('PAYLOAD_TOO_LARGE', 'Serialized object exceeds 2000 characters');
    }
    const msg = await ch.send({ content });
    indexRecord(state, msg.id, record);
    return { ...record };
  }

  /**
   * @param {string} tableName
   * @param {string} id
   */
  async getObjectById(tableName, id) {
    const rec = this._getRecord(tableName, id);
    return { ...rec };
  }

  /**
   * @param {string} tableName
   * @param {string} type
   */
  async getObjectsByType(tableName, type) {
    this._requireReady();
    const tableKey = normalizeTableKey(tableName);
    const state = this._tables.get(tableKey);
    if (!state) throw new DisDBError('TABLE_NOT_FOUND', `Unknown table "${tableKey}"`);
    const canonical = canonicalObjectType(String(type));
    if (!canonical) return [];
    const set = state.byType.get(canonical);
    if (!set || set.size === 0) return [];
    return [...set].map((i) => ({ ...state.byId.get(i).record }));
  }

  /**
   * @param {string} tableName
   * @param {string} name
   */
  async getObjectsByName(tableName, name) {
    this._requireReady();
    const tableKey = normalizeTableKey(tableName);
    const state = this._tables.get(tableKey);
    if (!state) throw new DisDBError('TABLE_NOT_FOUND', `Unknown table "${tableKey}"`);
    const nameKey = String(name).trim().toLowerCase();
    const set = state.byName.get(nameKey);
    if (!set || set.size === 0) return [];
    return [...set].map((i) => ({ ...state.byId.get(i).record }));
  }

  /**
   * All indexed rows in the table (sorted by Id).
   * @param {string} tableName
   */
  async getAllObjects(tableName) {
    this._requireReady();
    const tableKey = normalizeTableKey(tableName);
    const state = this._tables.get(tableKey);
    if (!state) throw new DisDBError('TABLE_NOT_FOUND', `Unknown table "${tableKey}"`);
    const rows = [...state.byId.values()].map((v) => ({ ...v.record }));
    rows.sort((a, b) => (a.Id < b.Id ? -1 : a.Id > b.Id ? 1 : 0));
    return rows;
  }

  /**
   * @param {string} tableName
   * @param {{ Id: string, Type: string, Name: string, ShortDescription: string, Props?: unknown[] }} record
   */
  async updateObject(tableName, record) {
    this._requireReady();
    const tableKey = normalizeTableKey(tableName);
    const state = this._tables.get(tableKey);
    if (!state) throw new DisDBError('TABLE_NOT_FOUND', `Unknown table "${tableKey}"`);
    if (!record || !record.Id) throw new DisDBError('INVALID_RECORD', 'updateObject() requires record.Id');

    const next = this._validatePayload(record, false);
    const existing = state.byId.get(next.Id);
    if (!existing) throw new DisDBError('NOT_FOUND', `No object with Id "${next.Id}" in table "${tableKey}"`);

    const content = JSON.stringify(next);
    if (content.length > 2000) {
      throw new DisDBError('PAYLOAD_TOO_LARGE', 'Serialized object exceeds 2000 characters');
    }

    const ch = await this._client.channels.fetch(state.channelId);
    const msg = await ch.messages.fetch(existing.messageId);
    await msg.edit({ content });

    unindexRecord(state, existing.record);
    indexRecord(state, existing.messageId, next);
    return { ...next };
  }

  /**
   * @param {string} tableName
   * @param {string} id
   */
  async deleteObject(tableName, id) {
    this._requireReady();
    const tableKey = normalizeTableKey(tableName);
    const state = this._tables.get(tableKey);
    if (!state) throw new DisDBError('TABLE_NOT_FOUND', `Unknown table "${tableKey}"`);

    const existing = state.byId.get(id);
    if (!existing) throw new DisDBError('NOT_FOUND', `No object with Id "${id}" in table "${tableKey}"`);

    const ch = await this._client.channels.fetch(state.channelId);
    const msg = await ch.messages.fetch(existing.messageId);
    await msg.delete();
    unindexRecord(state, existing.record);
  }

  _requireReady() {
    if (!this.connected || !this._guild) {
      throw new DisDBError('NOT_CONNECTED', 'Not connected');
    }
  }

  _getRecord(tableName, id) {
    this._requireReady();
    const tableKey = normalizeTableKey(tableName);
    const state = this._tables.get(tableKey);
    if (!state) throw new DisDBError('TABLE_NOT_FOUND', `Unknown table "${tableKey}"`);
    let row = state.byId.get(id);
    if (!row && typeof id === 'string') {
      const idLower = id.toLowerCase();
      for (const [key, v] of state.byId) {
        if (typeof key === 'string' && key.toLowerCase() === idLower) {
          row = v;
          break;
        }
      }
    }
    if (!row) throw new DisDBError('NOT_FOUND', `No object with Id "${id}" in table "${tableKey}"`);
    return row.record;
  }

  _validatePayload(obj, isCreate) {
    if (!obj || typeof obj !== 'object') throw new DisDBError('INVALID_RECORD', 'Record must be an object');
    const Id = obj.Id;
    if (!isCreate && (typeof Id !== 'string' || !Id)) {
      throw new DisDBError('INVALID_RECORD', 'Id must be a non-empty string');
    }
    if (isCreate && Id != null && (typeof Id !== 'string' || !Id)) {
      throw new DisDBError('INVALID_RECORD', 'Id must be a non-empty string when provided');
    }
    const Type = obj.Type;
    if (typeof Type !== 'string' || !OBJECT_TYPES.has(Type)) {
      throw new DisDBError(
        'INVALID_TYPE',
        `Type must be one of: ${[...OBJECT_TYPES].join(', ')}`,
        { Type },
      );
    }
    const Name = obj.Name;
    if (typeof Name !== 'string' || !Name.trim()) {
      throw new DisDBError('INVALID_NAME', 'Name must be a non-empty string');
    }
    const ShortDescription = obj.ShortDescription;
    if (typeof ShortDescription !== 'string') {
      throw new DisDBError('INVALID_SHORT_DESCRIPTION', 'ShortDescription must be a string');
    }
    let Props = obj.Props;
    if (Props === undefined) Props = [];
    if (!Array.isArray(Props)) throw new DisDBError('INVALID_PROPS', 'Props must be an array when present');

    return {
      Id: Id ?? undefined,
      Type,
      Name: Name.trim(),
      ShortDescription,
      Props,
    };
  }

  async _registerTableChannel(tableKey, channel) {
    const state = newTableState(channel.id);
    const messages = await fetchAllMessages(channel);
    const seenIds = new Set();
    for (const msg of messages) {
      if (!msg.content || !msg.content.trim()) continue;
      let record;
      try {
        record = JSON.parse(msg.content);
      } catch {
        continue;
      }
      try {
        record = this._validatePayload(record, false);
      } catch {
        continue;
      }
      if (seenIds.has(record.Id)) {
        unindexRecord(state, state.byId.get(record.Id).record);
      }
      seenIds.add(record.Id);
      indexRecord(state, msg.id, record);
    }
    this._tables.set(tableKey, state);
    this._channelIdToTableKey.set(channel.id, tableKey);
  }

  _bindGatewayHandlers() {
    if (this._listenersBound || !this._client) return;
    this._listenersBound = true;
    this._onMessageCreate = (msg) => this._syncMessageUpsert(msg);
    this._onMessageUpdate = (_old, msg) => this._syncMessageUpsert(msg);
    this._onMessageDelete = (msg) => this._syncMessageDelete(msg);
    this._onMessageDeleteBulk = (coll) => {
      for (const m of coll.values()) this._syncMessageDelete(m);
    };
    this._client.on('messageCreate', this._onMessageCreate);
    this._client.on('messageUpdate', this._onMessageUpdate);
    this._client.on('messageDelete', this._onMessageDelete);
    this._client.on('messageDeleteBulk', this._onMessageDeleteBulk);
  }

  _unbindGatewayHandlers() {
    if (!this._listenersBound || !this._client) return;
    this._client.off('messageCreate', this._onMessageCreate);
    this._client.off('messageUpdate', this._onMessageUpdate);
    this._client.off('messageDelete', this._onMessageDelete);
    this._client.off('messageDeleteBulk', this._onMessageDeleteBulk);
    this._listenersBound = false;
    this._onMessageCreate = null;
    this._onMessageUpdate = null;
    this._onMessageDelete = null;
    this._onMessageDeleteBulk = null;
  }

  _syncMessageUpsert(msg) {
    try {
      if (msg.guildId && this._guild?.id && msg.guildId !== this._guild.id) return;
      const tableKey = this._channelIdToTableKey.get(msg.channelId);
      if (!tableKey) return;
      const state = this._tables.get(tableKey);
      if (!state) return;
      if (!msg.content || !msg.content.trim()) return;
      let record;
      try {
        record = JSON.parse(msg.content);
      } catch {
        return;
      }
      try {
        record = this._validatePayload(record, false);
      } catch {
        return;
      }

      const prev = [...state.byId.entries()].find(([, v]) => v.messageId === msg.id);
      if (prev) unindexRecord(state, prev[1].record);
      indexRecord(state, msg.id, record);
    } catch {
      /* ignore sync errors */
    }
  }

  _syncMessageDelete(msg) {
    try {
      const chId = msg.channelId;
      if (!chId) return;
      if (msg.guildId && this._guild?.id && msg.guildId !== this._guild.id) return;
      const tableKey = this._channelIdToTableKey.get(chId);
      if (!tableKey) return;
      const state = this._tables.get(tableKey);
      if (!state) return;
      const entry = [...state.byId.entries()].find(([, v]) => v.messageId === msg.id);
      if (entry) unindexRecord(state, entry[1].record);
    } catch {
      /* ignore */
    }
  }
}

module.exports = {
  DisDB,
  DisDBError,
  OBJECT_TYPES: Object.freeze([...OBJECT_TYPES]),
};
