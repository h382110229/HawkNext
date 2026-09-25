// Catch Invalid URL at CLI bundle load with full stack
const OrigURL = globalThis.URL;
class TracingURL extends OrigURL {
  constructor(input, base) {
    try {
      super(input, base);
    } catch (e) {
      console.error("URL_FAIL input=", JSON.stringify(input), "base=", JSON.stringify(base));
      console.error(e && e.stack);
      throw e;
    }
  }
}
globalThis.URL = TracingURL;

const entry = process.argv[2];
try {
  await import(entry);
  console.log("LOADED OK");
} catch (e) {
  console.error("LOAD_FAIL", e && e.message);
  console.error(e && e.stack);
}
