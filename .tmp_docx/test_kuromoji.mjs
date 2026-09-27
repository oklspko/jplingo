import * as kuromoji from "@patdx/kuromoji";
import NodeDictionaryLoader from "@patdx/kuromoji/node";

const tokenizer = await new kuromoji.TokenizerBuilder({
  loader: new NodeDictionaryLoader({ dic_path: "node_modules/@patdx/kuromoji/dict/" }),
}).build();

for (const s of ["食べる", "早い", "優しい", "暗い", "動かす", "気持ち", "風邪を引く", "気が付く", "リーダー", "お変わりありませんか", "危ない", "暫く", "早速", "頭が上がらない"]) {
  const toks = tokenizer.tokenize(s);
  const reading = toks.map(t => t.reading || t.surface_form).join("");
  console.log(`${s}\t->\t${reading}`);
}
