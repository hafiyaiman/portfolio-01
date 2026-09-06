import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { CATALOG, CATEGORIES, DEFAULT_BUILD, CUSTOM_PARTS, selectedParts, validateBuild } from './catalog.ts';

test('invalid saved builds fall back safely', () => {
  assert.deepEqual(validateBuild(null), DEFAULT_BUILD);
  assert.deepEqual(validateBuild({ parts: { front: 999, bonnet: -1, skirts: 0.5 }, paint: 'not-a-color' }), DEFAULT_BUILD);
  assert.equal(validateBuild({ parts: { bonnet: 2 } }).parts.bonnet, 2);
});
test('all offered parts exist in shipped assets and categories are exclusive', () => {
  const ids = new Set();
  for (const name of ['silvia-s15.glb', 'silvia-customization.glb']) {
    const bytes = fs.readFileSync(new URL(`../../../public/models/${name}`, import.meta.url));
    const gltf = JSON.parse(bytes.toString('utf8', 20, 20 + bytes.readUInt32LE(12)));
    for (const node of gltf.nodes) if (node.extras?.sourcePart !== undefined) ids.add(node.extras.sourcePart);
  }
  for (const id of CUSTOM_PARTS) assert.ok(ids.has(id), `missing part ${id}`);
  for (const category of CATEGORIES) for (let i = 0; i < CATALOG[category].options.length; i++) {
    const build = { ...DEFAULT_BUILD, parts: { ...DEFAULT_BUILD.parts, [category]: i } };
    const selected = selectedParts(build);
    for (const part of CATALOG[category].options[i].parts) assert.ok(selected.has(part));
  }
});

test('five wing designs replace the original GT wing; None hides all wings', () => {
  const wings = CATALOG.spoiler.options.flatMap(option => option.parts);
  assert.equal(wings.length, 5);
  assert.equal(new Set(wings).size, 5);
  assert.ok(CUSTOM_PARTS.has(47));
  for (let i = 0; i < CATALOG.spoiler.options.length; i++) {
    const selected = selectedParts({ ...DEFAULT_BUILD, parts: { ...DEFAULT_BUILD.parts, spoiler: i } });
    assert.deepEqual(wings.filter(id => selected.has(id)), CATALOG.spoiler.options[i].parts);
  }
});

test('trunk selections are exclusive and old saved builds receive an original trunk', () => {
  const old = { parts: { front: 0, rear: 0, bonnet: 0, skirts: 0, spoiler: 2 }, paint: DEFAULT_BUILD.paint };
  assert.equal(validateBuild(old).parts.trunk, 0);
  assert.ok(selectedParts(old).has(11));
  for (let i = 0; i < CATALOG.trunk.options.length; i++) {
    const selected = selectedParts({ ...DEFAULT_BUILD, parts: { ...DEFAULT_BUILD.parts, trunk: i } });
    assert.deepEqual([11, 10, 9].filter(id => selected.has(id)), CATALOG.trunk.options[i].parts);
  }
});

test('customizable source meshes have only one owner across base and alternate assets', () => {
  const baseNames = new Set();
  for (const name of ['silvia-s15.glb', 'silvia-customization.glb']) {
    const bytes = fs.readFileSync(new URL(`../../../public/models/${name}`, import.meta.url));
    const asset = JSON.parse(bytes.toString('utf8', 20, 20 + bytes.readUInt32LE(12)));
    for (const node of asset.nodes) if (node.mesh !== undefined && CUSTOM_PARTS.has(node.extras?.sourcePart)) {
      assert.ok(!baseNames.has(node.name), `duplicated mesh ${node.name}`);
      baseNames.add(node.name);
    }
  }
});

test('fenders always select a matched pair and widebody selects only one shell', () => {
  const fenderIds = CATALOG.fenders.options.flatMap(option => option.parts);
  const shellIds = CATALOG.widebody.options.flatMap(option => option.parts);
  assert.equal(CATALOG.fenders.options.length, 5);
  assert.equal(CATALOG.widebody.options.length, 3);
  for (let fenders = 0; fenders < 5; fenders++) for (let widebody = 0; widebody < 3; widebody++) {
    const selected = selectedParts({ ...DEFAULT_BUILD, parts: { ...DEFAULT_BUILD.parts, fenders, widebody } });
    assert.deepEqual(fenderIds.filter(id => selected.has(id)), CATALOG.fenders.options[fenders].parts);
    assert.deepEqual(shellIds.filter(id => selected.has(id)), CATALOG.widebody.options[widebody].parts);
    assert.equal(CATALOG.fenders.options[fenders].parts[1] - CATALOG.fenders.options[fenders].parts[0], 5);
  }
});

test('older builds keep their original fenders and shell', () => {
  const restored = validateBuild({ parts: { spoiler: 4, trunk: 1 }, paint: DEFAULT_BUILD.paint });
  assert.equal(restored.parts.fenders, 0);
  assert.equal(restored.parts.widebody, 0);
  assert.equal(restored.parts.spoiler, 4);
  assert.equal(restored.parts.trunk, 1);
  const selected = selectedParts(restored);
  for (const id of [103, 214, 219]) assert.ok(selected.has(id));
});
