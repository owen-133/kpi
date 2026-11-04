# Requirements

Intro prose that mentions nothing special.

### R-001 Keep legacy output unchanged
layer: core
status: current
evidence:
- tests.txt:1
test-name:
- golden: legacy output is unchanged
accept:
- Given a legacy page / When it is served / Then the bytes equal the snapshot
