# Validation Plan

## Objective
Verify that recommendations improve fueling adherence and performance outcomes while maintaining low GI issues.

## Study design
- Prospective cohort + controlled pilot subgroups
- N >= 300 for initial broad confidence
- Mix of running/cycling/swimming/trail/hybrid cohorts

## Endpoints
- Primary: adherence to carbs target (g/h)
- Secondary: perceived exertion, performance, GI events, post-session recovery

## Technical validation
- Calibration error of confidence intervals
- Recommendation drift checks over time
- Segment-level fairness checks (sex, training level, sport)

## Release gates
- CI coverage >= 80% for engine core
- No high-severity data integrity defects
- Prediction quality thresholds met for launch cohort
