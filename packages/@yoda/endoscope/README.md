# @yoda/endoscope

## Metric names and labels
Every time series is uniquely identified by its metric name and optional key-value pairs called labels.

The metric name specifies the general feature of a system that is measured (e.g. `http_requests_total` - the total number of HTTP requests received). It may contain ASCII letters and digits, as well as underscores and colons. It must match the regex `[a-zA-Z_:][a-zA-Z0-9_:]*`.

Note: The colons are reserved for user defined recording rules. They should not be used by exporters or direct instrumentation.

Labels enable Prometheus's dimensional data model: any given combination of labels for the same metric name identifies a particular dimensional instantiation of that metric (for example: all HTTP requests that used the method `POST` to the `/api/tracks handler`). The query language allows filtering and aggregation based on these dimensions. Changing any label value, including adding or removing a label, will create a new time series.

Label names may contain ASCII letters, numbers, as well as underscores. They must match the regex `[a-zA-Z_][a-zA-Z0-9_]*`. Label names beginning with `__` are reserved for internal use.

Label values may contain any Unicode characters.

## Usage

### Counter

Counter metrics could be used in counting occurrence of events.

```js
var endoscope = require('@yoda/endoscope')
var metric = new endoscope.Counter('example_metric_counter', { labels: [ 'method', 'url' ] })

metric.inc({ method: 'POST', url: '/path' })
```

### Enum

Enum metrics are good for collecting item state shifting during a period of time.

```js
var endoscope = require('@yoda/endoscope')
var metric = new new endoscope.Enum('example_metric_state', { labels: [ 'method', 'url' ], states: [ 'start', 'end' ] })

metric.state({ method: 'POST', url: '/path' }, 'start')
metric.state({ method: 'POST', url: '/path' }, 'end')
```

### Histogram

Histogram metrics could be used to inspect how long an operation has been last.

```js
var endoscope = require('@yoda/endoscope')
var metric = new new endoscope.Histogram('example_metric_histogram', { labels: [ 'method', 'url' ] })

var slice = metric.start({ method: 'POST', url: '/path' })
metric.end(slice)
```

### Exporter

By defaults, all metrics would not be exported and would be discarded silently. To collect these metrics, an exporter has to be registered to export data.

```js
var endoscope = require('@yoda/endoscope')
var FloraExporter = require('@yoda/endoscope/exporter/flora')
endoscope.addExporter(new FloraExporter('yodaos.endoscope.export'))
// from now then metrics would be exported.
```
