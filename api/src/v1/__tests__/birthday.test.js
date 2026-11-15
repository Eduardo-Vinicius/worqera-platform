const test = require('node:test');
const assert = require('node:assert/strict');
const { parseBirthday } = require('../services/clientService');

test('birth date is optional and accepts the formats the web and the app send', () => {
  assert.equal(parseBirthday({}), undefined);
  assert.deepEqual(parseBirthday({ birthday: '' }), { birthDay: null, birthMonth: null, birthYear: null });
  assert.deepEqual(parseBirthday({ birthday: null }), { birthDay: null, birthMonth: null, birthYear: null });
  assert.deepEqual(parseBirthday({ birthday: '14/05' }), { birthDay: 14, birthMonth: 5, birthYear: null });
  assert.deepEqual(parseBirthday({ birthday: '14/05/1990' }), { birthDay: 14, birthMonth: 5, birthYear: 1990 });
  assert.deepEqual(parseBirthday({ birthDate: '1990-05-14' }), { birthDay: 14, birthMonth: 5, birthYear: 1990 });
  assert.deepEqual(parseBirthday({ birthday: { day: 3, month: 12, year: null } }), { birthDay: 3, birthMonth: 12, birthYear: null });
  assert.throws(() => parseBirthday({ birthday: '32/13' }), /Aniversário inválido/);
});
