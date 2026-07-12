import { NodeSDK } from '@opentelemetry/sdk-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { TraceExporter } from '@google-cloud/opentelemetry-cloud-trace-exporter';
import { resourceFromAttributes } from '@opentelemetry/resources';
import { ATTR_SERVICE_NAME } from '@opentelemetry/semantic-conventions';

const sdk = new NodeSDK({
  resource: resourceFromAttributes({
    [ATTR_SERVICE_NAME]: 'jantrack',
  }),
  traceExporter: new TraceExporter(),
  instrumentations: [
    getNodeAutoInstrumentations({
      // fs spans are too noisy for request traces
      '@opentelemetry/instrumentation-fs': { enabled: false },
      // resolver spans flood traces (800+ spans/request) and pg spans are
      // enough to spot N+1; re-enable temporarily when attribution is needed.
      // Note: ignoreTrivialResolveSpans doesn't work with NestJS code-first
      // (it sets an explicit resolver on every @Field).
      '@opentelemetry/instrumentation-graphql': {
        ignoreResolveSpans: true,
      },
    }),
  ],
});

sdk.start();

process.on('SIGTERM', () => {
  sdk
    .shutdown()
    .catch(console.error)
    .finally(() => process.exit(0));
});
