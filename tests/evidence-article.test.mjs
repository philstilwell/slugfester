import assert from 'node:assert/strict';
import test from 'node:test';
import { chartSnapshot as snapshot } from '../src/data/chart-snapshot.js';
import { evidenceArticleData as article, renderEvidenceArticle } from '../src/data/evidence-article.js';
test('article figures reconcile independently with the frozen chart edition', () => {
  assert.equal(article.date, snapshot.date);
  assert.equal(article.revision, snapshot.revision);
  assert.equal(article.debates, snapshot.debates.length);
  assert.equal(article.moves, snapshot.moves.length);
  const evidence = snapshot.dimensions.findIndex(([key]) => key === 'evidenceWarrant');
  for (const position of [0, 1]) {
    const groups = snapshot.debates.map((_, i) => snapshot.moves.filter(move => move.d === i && move.p === position));
    assert(groups.every(group => group.length));
    const mean = groups.reduce((total, group) => total + group.reduce((sum, move) => sum + move.x[evidence], 0) / group.length, 0) / groups.length;
    const rate = groups.reduce((total, group) => total + 100 * group.filter(move => move.x[evidence] < 70).length / group.length, 0) / groups.length;
    assert(Math.abs(mean - article.evidenceMeans[position]) < 1e-9);
    assert(Math.abs(rate - article.below70[position]) < 1e-9);
  }
  assert.match(renderEvidenceArticle(), /60\.6%/);
  assert.match(renderEvidenceArticle(), /25\.8%/);
});
