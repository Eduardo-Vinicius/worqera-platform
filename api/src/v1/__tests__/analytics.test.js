const test = require('node:test');
const assert = require('node:assert/strict');
const a = require('../services/platformAnalytics');

const H = 60 * 60 * 1000;
const t0 = new Date('2026-10-01T12:00:00.000Z').getTime();

test('activation funnel: conversion per step and median time between steps', () => {
  const rows = [
    { created: t0, onboarded: t0 + 2 * H, firstOrder: t0 + 5 * H, firstDelivered: t0 + 30 * H, paid: true },
    { created: t0, onboarded: t0 + 4 * H, firstOrder: t0 + 10 * H, firstDelivered: null, paid: false },
    { created: t0, onboarded: null, firstOrder: null, firstDelivered: null, paid: false },
    { created: t0, onboarded: t0 + 6 * H, firstOrder: null, firstDelivered: null, paid: false },
  ];
  const steps = a.funnelFrom(rows);
  assert.deepEqual(steps.map((s) => s.count), [4, 3, 2, 1, 1]);
  assert.deepEqual(steps.map((s) => s.pctOfPrev), [100, 75, 67, 50, 100]);
  assert.equal(steps[1].medianHours, 4); // created → onboarded: 2, 4, 6
  assert.equal(steps[2].medianHours, 4.5); // onboarded → first order: 3, 6
  assert.equal(steps[3].medianHours, 25);
  assert.equal(steps[4].medianHours, null);
});

test('weekly cohorts: % of each signup week active N weeks later', () => {
  const now = new Date('2026-10-28T12:00:00.000Z'); // Wednesday
  const users = [
    { id: 'u1', createdAt: new Date('2026-10-13T12:00:00.000Z') }, // week of Oct 12
    { id: 'u2', createdAt: new Date('2026-10-14T12:00:00.000Z') },
    { id: 'u3', createdAt: new Date('2026-10-21T12:00:00.000Z') }, // week of Oct 19
  ];
  const activity = [
    { userId: 'u1', day: '2026-10-13' },
    { userId: 'u1', day: '2026-10-20' },
    { userId: 'u2', day: '2026-10-14' },
    { userId: 'u1', day: '2026-10-27' },
    { userId: 'u3', day: '2026-10-22' },
  ];
  const table = a.cohortTable({ users, activity, now, weeks: 3 });
  const oct12 = table.rows.find((r) => r.week === '2026-10-12');
  assert.equal(oct12.size, 2);
  assert.deepEqual(oct12.cells, [100, 50, 50]);
  const oct19 = table.rows.find((r) => r.week === '2026-10-19');
  assert.deepEqual(oct19.cells, [100, 0]);
  assert.equal(a.median([]), null);
  assert.equal(a.median([3, 1, 2]), 2);
  assert.deepEqual([0, 80, 250, 900, 5000].map(a.valueBand), ['Sem valor', 'Até R$ 100', 'R$ 100–300', 'R$ 300–1.000', 'Acima de R$ 1.000']);
});
