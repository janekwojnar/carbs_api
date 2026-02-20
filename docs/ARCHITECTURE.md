# System Architecture

## Top-level
- Web app (athlete-first UX)
- API service (prediction + simulation + audit)
- Data layer (profiles, sessions, recommendations, logs)
- Integration layer (device/training APIs)
- Model layer (rules + ML upgrades)

## Runtime components
1. `UI` -> collects athlete/session/environment inputs
2. `Predict API` -> validates request, computes recommendations
3. `Engine` -> calculates carbs/hydration/sodium/GI risk/confidence and multi-strategy output
4. `Audit Store` -> persists recommendation snapshots and rationale
5. `Simulation API` -> runs what-if modifications

## Modeling strategy
- Phase 1: explainable hybrid rules engine with uncertainty model
- Phase 2: personalized adaptation layer (Bayesian updates / gradient boosting)
- Phase 3: real-time streaming adjustments from device telemetry

## Reliability (99.9%)
- Stateless API pods behind load balancer
- Health checks and autoscaling
- Rate limits + circuit breakers for external integrations
- Structured logs + tracing
- Synthetic checks on prediction endpoint

## Security and compliance baseline
- OAuth2 for user auth in production
- Data encryption at rest and in transit
- Audit logs immutable append model
- GDPR policy controls (consent, deletion, export)

## Monorepo structure
- `src/api` HTTP layer
- `src/core` domain logic
- `src/integrations` provider adapters
- `src/storage` persistence
- `src/web` frontend assets
