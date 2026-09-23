import { createCodingSession } from "../src/coding-session.ts";

const key = process.env.HAWKNEXT_LLMAPI_API_KEY;
if (!key) throw new Error("missing key");

const session = createCodingSession({ apiKey: () => key });
const kinds = new Set();
const turn = await session.runTurn(
  'Create hello.js with console.log("HAWK") using write_file.',
  [],
  {},
  { stream: true },
);

console.log("routed=", turn.routedModel, "auto=", turn.defaultedToAuto);
console.log("files=", Object.keys(turn.files).join(","));
console.log("tools=", turn.toolCalls.map((t) => t.name).join(","));
console.log("text=", JSON.stringify(turn.result.text).slice(0, 100));
console.log("thought_len=", turn.result.thought.length);
if (!turn.files["hello.js"]) {
  throw new Error("missing hello.js: " + JSON.stringify(turn.files));
}
console.log("CODING_LIVE_OK");
