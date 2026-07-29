// Merit Badge Massacre: THE OFFER BUILDER. What can be offered, how likely it
// is, and how a round of offers is filled for however many scouts are standing
// there.
//
// This is the one place the pool gating ruleset (BUILD_ARCHITECTURE.md 4.6)
// lives. Before this file, levelPool() rebuilt the pool from ownership alone
// with four fixed weights and no memory at all, so a card you turned down at
// rank 3 was exactly as likely at rank 4 and the same three cards could chase
// a player all night.
//
// THE CO-OP CONSTRAINTS THIS FILE IS WRITTEN AGAINST, because getting them
// wrong later is a rewrite rather than an edit:
//
//   C2. Owner first, on every offer, apply and grant function. offer(owner, n)
//       and round(owners, n), never a function that reads a single `this`.
//
//   C3. The builder accepts a TAKEN SET and fills N DISTINCT offers for N
//       players in one round. Two panels open at once show no card in common.
//
//   RUN WIDE EXCLUSIVITY IS NOT ASSUMED AND MUST NEVER BE ADDED. It is
//       arithmetically impossible: 26 picks a night per scout against 72 items
//       available on a fresh save means two scouts need 52 of 72 and three need
//       78 of 72. Exclusivity is per ROUND, which is the whole rule. What keeps
//       two scouts apart is the capped channels (four weapon slots from twelve,
//       four fork ends each, one keystone from eight), never the ledger.
//       Grep for RUN_WIDE_EXCLUSIVE below: it is a named constant set to false
//       so that a future pass has to argue with a comment rather than a habit.
'use strict';

const Pool = (function () {

  // See the header. This is not a toggle.
  const RUN_WIDE_EXCLUSIVE = false;

  // RULE 2. Six closed families, and a family may pay at most six ledger items
  // a night. The invariant that has to hold, and that any change to any of
  // these three numbers re-checks: families * cap must exceed ledger picks per
  // run ON A FRESH SAVE. Six times six is 36 against 26 picks, a 38 percent
  // margin, and all six families ship unlocked so it holds on a fresh save and
  // not merely at full board.
  const FAMILIES = ['geometry', 'heat', 'cold', 'motion', 'blood', 'take'];
  const FAMILY_CAP = 6;
  const LEDGER_PICKS_PER_RUN = 26;

  // RULE 1. Taken deletes, seen decays. Two tiers, not six, and they do not
  // compound: a card is fresh, or it was offered in a draft and declined, or
  // it was seen in a chest or a shop and not taken. The strongest that applies
  // is the one that counts, so a thing you could not afford comes back at 0.7
  // rather than disappearing.
  const DECLINED_MUL = 0.35;
  const SEEN_MUL = 0.70;

  // The shipped weights, unchanged. They were four literals inside levelPool.
  const WEIGHT = {
    weaponLevel: 10,   // level up a weapon you carry
    weaponNew: 6,      // a weapon you do not carry yet
    patchLevel: 8,     // rank up a patch you carry
    patchNew: 5,       // a patch you do not carry yet
    item: 12,          // a ledger item
  };

  // Luck (stat 19) biases what appears AND biases rarity. An entry with no
  // rarity is rarity 0 and luck does nothing to it, which is why the shipped
  // weapons and patches are untouched at any luck value.
  const LUCK_PER_POINT = 0.04;

  // Which stat a shipped patch feeds, so RULE 6 (no dead card, ever) can ask
  // whether one more rank of it would land on nothing after clamping. A patch
  // that is not in this table is never refused: refusing a card because we
  // could not evaluate it is how a pool empties itself.
  const PATCH_STAT = {
    trailmix: 'damage',
    boots: 'moveSpeed',
    whistle: 'attackSpeed',
    skillet: 'armourFlat',
    lodestone: 'pickupRadius',
    fieldguide: 'badgeXP',
    rabbitfoot: 'critChance',
    firstaid: 'regen',
  };

  // ------------------------------------------------------------------ memory

  // One Map, cleared at run start. It holds a tier per card key and nothing
  // else, so it serialises to a handful of bytes and survives a snapshot.
  function memory() {
    return { tier: new Map() };
  }

  function keyOf(entry) { return entry.kind + ':' + entry.id; }

  // Record that a card was put in front of somebody and not taken. `how` is
  // 'declined' for a draft card that lost, 'seen' for a chest or shop card
  // that was looked at and left.
  function mark(mem, entry, how) {
    if (!mem || !mem.tier || !entry) return;
    const k = keyOf(entry);
    const cur = mem.tier.get(k);
    if (how === 'declined') { mem.tier.set(k, 'declined'); return; }
    if (cur !== 'declined') mem.tier.set(k, 'seen');
  }

  function decayOf(mem, entry) {
    if (!mem || !mem.tier) return 1;
    const t = mem.tier.get(keyOf(entry));
    if (t === 'declined') return DECLINED_MUL;
    if (t === 'seen') return SEEN_MUL;
    return 1;
  }

  // ------------------------------------------------------------------ context

  // Everything the builder needs about one scout, read once. taken is the
  // scout's OWN set, which is what makes run wide exclusivity structurally
  // absent rather than merely switched off.
  function contextFor(owner, game) {
    const b = (owner && owner.build) || null;
    const held = (b && Array.isArray(b.items)) ? b.items : [];
    const taken = new Set(held);
    const fam = {};
    for (const f of FAMILIES) fam[f] = 0;
    const cat = (typeof DATA !== 'undefined' && DATA && DATA.relics) ? DATA.relics : null;
    if (cat) {
      for (const id of held) {
        const def = cat[id];
        if (def && def.family && fam[def.family] !== undefined) fam[def.family]++;
      }
    }
    const block = (b && b.stats) || null;
    return {
      owner, game, taken, family: fam, block,
      luck: block && block.luck ? block.luck : 0,
      frame: (game && game._statFrame) || null,
      grants: (b && b.grants) || null,
      mem: (game && game.pool) || null,
    };
  }

  // ------------------------------------------------------------------ candidates

  // The pool, rebuilt from what this scout owns. This is levelPool's own body,
  // moved here whole so the answers do not change: the same four weights, the
  // same gates, the same order.
  function candidates(owner, game) {
    const out = [];
    if (!game) return out;
    const owned = id => game.weapons.find(w => w.id === id);
    for (const w of game.weapons) {
      if (w.lvl < DATA.WEAPON_MAX) {
        out.push({ kind: 'weapon', id: w.id, isNew: false, lvl: w.lvl + 1, wgt: WEIGHT.weaponLevel });
      }
    }
    if (game.weapons.length < DATA.WEAPON_SLOTS) {
      for (const id in DATA.weapons) {
        if (!owned(id)) out.push({ kind: 'weapon', id, isNew: true, lvl: 1, wgt: WEIGHT.weaponNew });
      }
    }
    const pcount = Object.keys(game.passives).length;
    for (const id in DATA.passives) {
      const cur = game.passives[id] || 0;
      if (cur > 0 && cur < DATA.passives[id].max) {
        out.push({ kind: 'passive', id, isNew: false, lvl: cur + 1, wgt: WEIGHT.patchLevel });
      } else if (cur === 0 && pcount < DATA.PASSIVE_SLOTS) {
        out.push({ kind: 'passive', id, isNew: true, lvl: 1, wgt: WEIGHT.patchNew });
      }
    }
    // 3.0 demonstration items, behind the same flag a normal run never sets.
    if (DATA.DEBUG_TRAITS && DATA.relics) {
      for (const id in DATA.relics) {
        const def = DATA.relics[id];
        if (owner && owner.build && owner.build.items.indexOf(id) === -1) {
          out.push({ kind: 'relic', id, isNew: true, lvl: 1, wgt: WEIGHT.item, family: def && def.family });
        }
      }
    }
    return out;
  }

  // ------------------------------------------------------------------ gating

  // RULE 6. Would this card land on nothing after clamping? Only answered for
  // cards whose effect this file can actually evaluate.
  function isDeadCard(entry, ctx) {
    if (typeof Stats === 'undefined' || !Stats || !ctx.frame) return false;
    if (entry.kind === 'passive') {
      const key = PATCH_STAT[entry.id];
      if (!key) return false;
      // One more rank of this patch multiplies or adds into the same stat the
      // frame already carries, so the honest test is whether the stat is
      // already sitting on its bound.
      const v = ctx.block ? ctx.block[key] : undefined;
      if (v === undefined) return false;
      const b = ctx.frame.bounds[key];
      return b !== undefined && v >= b.max;
    }
    if (entry.kind === 'relic' && entry.stat) {
      return Stats.isDead(entry.stat, ctx.frame, ctx.grants || Stats.grants());
    }
    return false;
  }

  // RULES 1, 2 and 6 plus the luck bias, applied to one candidate list. Weights
  // are written onto copies: the caller's entries are never mutated, because a
  // round builds several offers off one candidate list.
  function gate(entries, ctx) {
    const out = [];
    for (const e of entries) {
      // RULE 1, first half: taken deletes.
      if (e.kind === 'relic' && ctx.taken.has(e.id)) continue;
      // RULE 2: a family that has already paid six ledger items is closed.
      if (e.family && ctx.family[e.family] !== undefined && ctx.family[e.family] >= FAMILY_CAP) continue;
      // RULE 6: no dead card, ever.
      if (isDeadCard(e, ctx)) continue;
      let w = e.wgt * decayOf(ctx.mem, e);
      // Luck biases rarity: a common card is rarity 0 and does not move.
      if (ctx.luck > 0 && e.rarity) w *= (1 + ctx.luck * LUCK_PER_POINT * e.rarity);
      if (!(w > 0)) continue;
      const c = {};
      for (const k in e) c[k] = e[k];
      c.wgt = w;
      out.push(c);
    }
    return out;
  }

  // ------------------------------------------------------------------ the draw

  // The shipped draw, unchanged: sum the weights, roll once, walk to the
  // chosen entry, reject a duplicate and roll again, give up after 200 tries.
  // It is kept exactly as it was because the number and ORDER of Math.random
  // calls is part of what a seeded run reproduces.
  //
  // `blocked` is RULE 3 and the round exclusion arriving in the same place: a
  // key the offer may not contain. With no families authored and one scout it
  // never fires, so the sequence is the shipped one.
  function draw(entries, n, opts) {
    opts = opts || {};
    const rng = opts.rng || Math.random;
    const out = [];
    if (!entries.length) return out;
    const famUsed = {};
    let guard = 0;
    while (out.length < Math.min(n, entries.length) && guard++ < 200) {
      let total = 0;
      for (const p of entries) total += p.wgt;
      let roll = rng() * total;
      let chosen = entries[0];
      for (const p of entries) { roll -= p.wgt; if (roll <= 0) { chosen = p; break; } }
      if (out.some(o => o.kind === chosen.kind && o.id === chosen.id)) continue;
      // C3: no card in common with the other panels open this round.
      if (opts.blocked && opts.blocked.has(keyOf(chosen))) continue;
      // RULE 3: no offer contains two items of one family.
      if (chosen.family && famUsed[chosen.family]) continue;
      if (chosen.family) famUsed[chosen.family] = true;
      out.push(chosen);
    }
    return out;
  }

  // ------------------------------------------------------------------ offers

  // ONE SCOUT'S OFFER. Owner first (C2).
  function offer(owner, n, game, opts) {
    opts = opts || {};
    const ctx = contextFor(owner, game);
    const entries = opts.entries || candidates(owner, game);
    const gated = gate(entries, ctx);
    return draw(gated, n, opts);
  }

  // A WHOLE ROUND. N distinct offers for N scouts off one catalogue, with no
  // card appearing on two panels (C3). Each scout is gated against their OWN
  // taken set, so nothing here assumes run wide exclusivity.
  function round(owners, n, game, opts) {
    opts = opts || {};
    const blocked = opts.blocked || new Set();
    const out = [];
    for (const owner of owners) {
      const picks = offer(owner, n, game, { rng: opts.rng, blocked });
      for (const p of picks) blocked.add(keyOf(p));
      out.push(picks);
    }
    return out;
  }

  // Everything a round put in front of somebody and did not get taken. Called
  // with the offer and the pick, it is what turns RULE 1 from a rule into a
  // thing that happens.
  function recordOutcome(mem, offered, taken, how) {
    if (!mem || !Array.isArray(offered)) return;
    const tk = taken ? keyOf(taken) : null;
    for (const e of offered) {
      if (tk !== null && keyOf(e) === tk) continue;
      mark(mem, e, how || 'declined');
    }
  }

  // The gate 4.6 asks to be checked rather than assumed.
  function familyInvariant() {
    return {
      families: FAMILIES.length,
      cap: FAMILY_CAP,
      capacity: FAMILIES.length * FAMILY_CAP,
      picks: LEDGER_PICKS_PER_RUN,
      ok: FAMILIES.length * FAMILY_CAP > LEDGER_PICKS_PER_RUN,
      margin: (FAMILIES.length * FAMILY_CAP) / LEDGER_PICKS_PER_RUN - 1,
    };
  }

  return {
    RUN_WIDE_EXCLUSIVE, FAMILIES, FAMILY_CAP, WEIGHT,
    DECLINED_MUL, SEEN_MUL, PATCH_STAT, LEDGER_PICKS_PER_RUN,
    memory, mark, decayOf, keyOf, contextFor,
    candidates, gate, draw, offer, round, recordOutcome, familyInvariant,
  };
})();

if (typeof module !== 'undefined' && module.exports) module.exports = Pool;
