import assert from 'node:assert/strict';
import { test } from 'node:test';
import { create, form, quotations, reviewedQuote, state } from './helpers/submission-fixtures.mjs';

test('refresh rejects an editor loaded on A after another editor saves B', async () => {
  const fixture = state();
  const packageA = await create(fixture, { ...form(), name: 'Package A' });
  const packageB = await create(fixture, { ...form(), name: 'Package B' });
  const flightA = fixture.tables.package_flights.find(flight => flight.package_id === packageA)._id;
  const flightB = fixture.tables.package_flights.find(flight => flight.package_id === packageB)._id;
  const payload = await reviewedQuote(fixture, packageA, flightA);
  const { id } = await quotations.create._handler(fixture.ctx, { payload });
  const loaded = await quotations.getQuotationForEdit._handler(fixture.ctx, { target_quotation_id: id });
  assert.equal(loaded.package_id, packageA);

  const review = quotations.getSnapshotRefreshReview
    ? await quotations.getSnapshotRefreshReview._handler(fixture.ctx, {
      quotation_id: id,
      expected_quotation_token: loaded.snapshot_refresh_token,
    })
    : {};
  delete payload.reviewed_context;
  await quotations.update._handler(fixture.ctx, {
    payload: { ...payload, id, package_id: packageB, flight_id: flightB },
  });
  fixture.tables.packages.find(pkg => pkg._id === packageB).name = 'Package B unseen';

  const before = structuredClone(fixture.tables);
  await assert.rejects(() => quotations.refreshSnapshot._handler(fixture.ctx, {
    quotation_id: id,
    expected_quotation_token: review.expected_quotation_token,
    source_context: review.source_context,
  }), error => error.data?.code === 'SNAPSHOT_REFRESH_CONFLICT');
  assert.deepEqual(fixture.tables, before);
});
