# Requirements

Intro prose that mentions nothing special.

### R-001 Register a request
layer: core
status: current
evidence:
- tests.txt:1
accept:
- Given a user / When they act / Then the outcome is stored

### R-002 Golden backed 2
layer: core
status: current
evidence:
- tests.txt:1
golden:
- secured/health
accept:
- Given a user / When they act / Then the outcome is stored

### R-003 Refuse a second close
layer: core
status: current
evidence:
- tests.txt:1
test-name:
- closing a request twice fails
accept:
- Given a user / When they act / Then the outcome is stored

### R-004 Export a report
layer: supporting
status: planned
evidence:
- tests.txt:1-2

### R-005 Legacy fax intake
layer: out
status: dropped
evidence:
- gone-file.ts:1
