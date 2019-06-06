# Protocol Fauna

Protocol Fauna initiates flora depended yodaos runtime-application IPC mechanism. Which broaden client variety possibilities, i.e. we could implement an application without depends on JavaScript engine and ShadowNode runtime.

### Process Startup

It is common that process might have been launched for a while yet it doesn't ready for runtime events. For the sake of this situation, runtime would wait app process to announce it's readiness until sending runtime events.

#### `yodaos.fauna.status-report` [ `status` ]

- `status`: enum of `ready`, `alive`
- Returns: []

On report of `ready`, runtime would initiate ANR detection for a 15 seconds window. That is to say if application doesn't send report of `alive` for 15 continuous seconds, runtime would send signal SIGKILL to application process.

For report of `alive`, runtime would refresh ANR detection window for a new 15 seconds.

### Invoke Methods

#### `yodaos.fauna.invoke` [ `invocationJson` ]

- `invocationJson`: JSON stringified of
```typescript
interface Invocation {
  'namespace'?: string
  'method': string
  'params': any[]
}
```
- Returns: [ `resultJson` ]
```typescript
interface ResolvedResult {
  'action': 'resolve'
  'result': any
}
interface RejectedResult {
  'action': 'reject'
  'error': any
}

type Result = ResolvedResult | RejectedResult
```

### Subscribe Events

#### `yodaos.fauna.subscribe` [ `subscriptionJson` ]

- `subscriptionJson`: JSON stringified of
```typescript
interface Subscription {
  'namespace'?: string
  'event': string
  'params': any[]
}
```
- Returns: []

### Application Event Harbor

#### `yodaos.fauna.harbor` [ `type`, `messageJson` ]

- `type`: enum of `event`, `fatal-error`, `internal`
- `messageJson`: JSON stringified of
```typescript
interface Event {
  'namespace': string
  'event': string
  'params': any[]
}

interface FatalError {
  'message': string
}

interface Internal {

}

type Message = Event | FatalError | Internal
```

Application should declare `yodaos.fauna.harbor` with flora connection name `<app-id>:<pid>`, e.g. `cloud-player:2485`.
