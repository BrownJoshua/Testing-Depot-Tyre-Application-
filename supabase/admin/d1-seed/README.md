# D1 seed tools

Regenerates migration `0018_d1_opening_data.sql` from the reference prototype (`MTC-Depot-Tyre D1.html`).

1. `node unpack.mjs "<path to MTC-Depot-Tyre D1.html>" <scratch dir>` unpacks the pages.
2. Set the `P` path in `d1data.mjs` to that scratch dir, then `node gen0018.mjs`.

Data only; nothing from the prototype is executed. The scripts are kept for traceability: 0018 is already applied and must not be edited (add a new migration instead).
