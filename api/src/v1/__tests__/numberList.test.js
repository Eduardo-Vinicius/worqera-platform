const test = require('node:test');
const assert = require('node:assert/strict');
const { asNumberList, numberListIsClean } = require('../lib/numberList');

test('photo counter stored as text becomes the original numbers', () => {
  assert.deepEqual(asNumberList("[ { '0': 1 } ]"), [1]);
  assert.deepEqual(asNumberList(["[ { '0': 1 } ]"]), [1]);
  assert.deepEqual(asNumberList({ 0: 1 }), [1]);
  assert.deepEqual(asNumberList([1, 0]), [1, 0]);
  assert.equal(numberListIsClean("[ { '0': 1 } ]"), false);
  assert.equal(numberListIsClean([1]), true);
});
