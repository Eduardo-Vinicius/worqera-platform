const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const {
  computeRollupSectorId,
  allItemsInTerminal,
  buildSectorsById,
  pairLabel,
} = require('./itemSectors.js');

describe('itemSectors', () => {
  const sectors = [
    { _id: 'a', order: 1, isTerminal: false },
    { _id: 'b', order: 2, isTerminal: false },
    { _id: 't', order: 99, isTerminal: true },
  ];
  const byId = buildSectorsById(sectors);

  it('pairLabel', () => {
    assert.equal(pairLabel('0042', 1), '0042-1');
  });

  it('rollup prefers non-terminal earlier in board', () => {
    const items = [
      { currentSectorId: 't' },
      { currentSectorId: 'a' },
    ];
    assert.equal(computeRollupSectorId(items, byId), 'a');
  });

  it('allItemsInTerminal', () => {
    assert.equal(
      allItemsInTerminal([{ currentSectorId: 't' }, { currentSectorId: 't' }], byId),
      true
    );
    assert.equal(
      allItemsInTerminal([{ currentSectorId: 'a' }, { currentSectorId: 't' }], byId),
      false
    );
  });
});
