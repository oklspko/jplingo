import * as kuromoji from "@patdx/kuromoji";
import NodeDictionaryLoader from "@patdx/kuromoji/node";
const tokenizer = await new kuromoji.TokenizerBuilder({ loader: new NodeDictionaryLoader({ dic_path: "node_modules/@patdx/kuromoji/dict/" }) }).build();

const cases = [
  "それから然后；还有",
  "例えば比如、例如",
  "一方另一方面",
  "逆に反過來",
  "また而且、还有",
  "いい①好、棒；可以、允许",
  "動く（うごく）②（自一）移动",
  "懐かしい（なつかしい）④怀念、眷恋",
  "力強い（ちからづよい）⑤强有力；踏实",
  "礼儀正しい（れいぎただしい）⑥有礼貌",
];
for (const s of cases) {
  const toks = tokenizer.tokenize(s);
  const parts = toks.map(t => `${t.surface_form}[${t.word_type}]`).join(" ");
  console.log(`${s}\n  -> ${parts}`);
}
