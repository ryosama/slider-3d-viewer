const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const C = require('../src/core.js');

test('configuration Markdown, order and fallbacks', () => {
  const config = C.parseConfig('# Titre\r\n## order\r\n- slides/a.md\r\n- slides/b.md\r\n## theme\r\n- text-color: #abc\r\n- breadcrumb-style: wrong\r\n## transition\r\n- when-slide-to-next: wrong');
  assert.deepEqual(config.order, ['slides/a.md', 'slides/b.md']);
  assert.equal(config.theme['text-color'], '#abc');
  assert.equal(config.theme['breadcrumb-style'], 'dotted');
  assert.equal(config.transition['when-slide-to-next'], 'follow-breadcrumb');
  assert.equal(C.parseConfig('').theme['text-color'], '#fff');
});

test('Markdown escapes executable content and rejects executable links', () => {
  const html = C.markdown('# Titre\n\n<script>alert(1)</script>\n\n[x](javascript:alert) [x](data:text/html,bad) [ok](https://example.com)');
  assert.ok(!html.includes('<script>'));
  assert.ok(!html.includes('href="javascript:'));
  assert.ok(!html.includes('href="data:'));
  assert.ok(html.includes('&lt;script&gt;'));
  assert.ok(html.includes('rel="noopener noreferrer"'));
});

test('relative images and slide links keep nested paths', () => {
  assert.equal(C.resolve('slides/topic/a.md', '../../assets/a.svg'), 'assets/a.svg');
  assert.equal(C.resolve('slides/a.md', 'b.md'), 'slides/b.md');
  let path;
  const html = C.markdown('![alt](../assets/a.svg)\n\n[Suivant](b.md)', { image(value) { path = value; return 'blob:local-image'; } });
  assert.equal(path, '../assets/a.svg');
  assert.ok(html.includes('src="blob:local-image"'));
  assert.ok(html.includes('data-slide-link="b.md"'));
});

test('code, lists and paragraphs form separate blocks', () => {
  const html = C.markdown('Texte **gras** et *italique*.\n\n- un\n- deux\n\n```js\n<script>\n```\n\n> citation');
  assert.ok(html.includes('<strong>gras</strong>'));
  assert.ok(html.includes('<em>italique</em>'));
  assert.ok(html.includes('<ul><li>un</li><li>deux</li></ul>'));
  assert.ok(html.includes('<pre><code>&lt;script&gt;</code></pre>'));
  assert.ok(html.includes('<blockquote>citation</blockquote>'));
});

test('demo has ten ordered slides with available offline images and internal targets', () => {
  const context = { window: {} };
  vm.runInNewContext(fs.readFileSync('src/demo.js', 'utf8'), context);
  const deck = context.window.ORBITE_DEMO;
  const order = C.parseConfig(deck.config).order;
  assert.equal(order.length, 10);
  assert.deepEqual([...deck.slides.map(s => s.path)], order);
  for (const slide of deck.slides) {
    assert.equal(slide.text, fs.readFileSync(slide.path, 'utf8'));
    C.markdown(slide.text, { image(path) {
      const image = deck.assets[C.resolve(slide.path, path)];
      assert.ok(image?.startsWith('data:image/svg+xml;base64,'));
      return image;
    } });
    for (const match of slide.text.matchAll(/\[[^\]]+\]\(([^)]+\.md)\)/g)) {
      assert.ok(order.includes(C.resolve(slide.path, match[1])));
    }
  }
});

test('animation configuration numbers remain finite and bounded', () => {
  assert.equal(C.number('NaN', 1), 1);
  assert.equal(C.number('-1', 1), .1);
  assert.equal(C.number('10000000', 1), 10);
  assert.equal(C.number('1.7', 1), 1.7);
});
