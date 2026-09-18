// node test.js — the emulator is the only non-trivial part, so that is what is tested.
const assert = require('assert');
const { Screen, parse } = require('./castplay.js');

const run = (s, cols = 20, rows = 6) => { const t = new Screen(cols, rows); t.write(s); return t; };
const plain = (t) => t.html().replace(/<[^>]+>/g, '');

// \r rewrites the line in place (spinners, progress bars)
assert.strictEqual(run('working...\rdone').text(), 'doneing...');
// erase-to-end after \r is the usual idiom, and must actually clear the tail
assert.strictEqual(run('working...\r\x1b[Kdone').text(), 'done');
// cursor up + erase line: demo-magic rewrites the line above
assert.strictEqual(run('one\r\ntwo\r\n\x1b[2A\x1b[Kuno').text(), 'uno\ntwo');
// LF is line feed only, as on a real terminal: the column is kept, so \n alone indents
assert.strictEqual(run('one\ntwo').text(), 'one\n   two');
// erase whole screen
assert.strictEqual(run('junk\nmore\x1b[2Jfresh').text(), 'fresh');
// absolute cursor positioning
assert.strictEqual(plain(run('\x1b[2;3Hx')).split('\n')[1], '  x');
// wrap at the right margin
assert.strictEqual(run('abcdef', 3).text(), 'abc\ndef');
// scrollback: only the last `rows` lines are rendered, and the rest survive in text()
const scrolled = run('1\r\n2\r\n3\r\n4\r\n5\r\n6\r\n7', 20, 3);
assert.strictEqual(plain(scrolled), '5\n6\n7');
assert.ok(scrolled.text().startsWith('1\n2\n3'));
// colours: 16, 256 and truecolour, closed by a reset
const col = run('\x1b[31ma\x1b[38;5;208mb\x1b[38;2;1;2;3mc\x1b[0md');
assert.ok(col.html().includes('color:#FF7B72'), 'basic red');
assert.ok(col.html().includes('rgb(255,135,0)'), '256-colour');
assert.ok(col.html().includes('rgb(1,2,3)'), 'truecolour');
assert.ok(/<\/span>d$/.test(col.html().split('\n')[0]), 'reset ends the run');
// bold + dim + underline
assert.ok(run('\x1b[1;4mx').html().includes('font-weight:700'));
// OSC titles are swallowed, not printed
assert.strictEqual(run('\x1b]0;a title\x07ok').text(), 'ok');
// HTML is escaped
assert.ok(run('<b>&').html().includes('&lt;b&gt;&amp;'));

// parser: raw text, parsed array, and {header, events}; input events are dropped
const raw = '{"version":2,"width":80,"height":24}\n[0.1,"o","hi"]\n[0.2,"i","x"]\n';
for (const form of [raw, raw.trim().split('\n').map(JSON.parse), { header: { version: 2 }, events: [[0.1, 'o', 'hi'], [0.2, 'i', 'x']] }]) {
  const p = parse(form);
  assert.strictEqual(p.events.length, 1);
  assert.strictEqual(p.events[0][2], 'hi');
}
assert.throws(() => parse('{"nope":1}'), /asciicast v2/);

console.log('ok');
