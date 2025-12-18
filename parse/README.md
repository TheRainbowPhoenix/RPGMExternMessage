# Translate MV / MZ

Need LocalLM / OpenAI endpoint accessible. Usage:

```sh
game\data>deno run -A ..\parser\text-extractor.ts

game\data>deno run -A ..\parser\translate.ts ExternMessage.csv ExternMessage_Auto.csv

game\data>deno run -A ..\parser\clean.ts

mv ExternMessage_AutoClean.csv ExternMessage.csv
```

Plugin conf :
`{"name":"ExternMessage","status":true,"description":"Include message from external file.","parameters":{"Line Max":"4","Csv File Path":"ExternMessage.csv","Csv File Encode":"utf-8","Use Name Tag":"true","Default Reference Column Index":"2","Fail Safe":"true"}}`

## Plugins.js text helper

Extract Japanese strings from `plugins.js` and export them to a CSV, then apply
translations back (longest originals replaced first to avoid substring
collisions).

```sh
# From the data folder (default paths target ../js/plugins.js)
deno run -A ..\parser\plugins-text.ts extract

# After filling the "translated" column in plugins_text.csv
deno run -A ..\parser\plugins-text.ts apply
```

Check coverage quickly:

```sh
deno run -A ..\parser\plugins-text-check.ts
```

You can override paths:

```sh
deno run -A ..\parser\plugins-text.ts extract path/to/plugins.js path/to/plugins_text.csv
deno run -A ..\parser\plugins-text.ts apply path/to/plugins.js path/to/plugins_text.csv
deno run -A ..\parser\plugins-text-check.ts path/to/plugins.js path/to/plugins_text.csv
```

## DeepSeek translator

Translate missing English cells in a CSV (supports `ExternMessage.csv` format
and `plugins_text.csv` two-column files) using the DeepSeek API. Requires
`DEEPSEEK_API_KEY` in the environment.

```sh
deno run -A ..\parser\translate-deepseek.ts ExternMessage.csv ExternMessage_out.csv
```

Environment overrides:

- `DEEPSEEK_API_URL` (default: `https://api.deepseek.com/v1/chat/completions`)
- `DEEPSEEK_MODEL` (default: `deepseek-chat`)
- `DEEPSEEK_BATCH_SIZE` (default: 15)

## Qwen translator (no API key)

Use the Qwen3 Coder WebDev Space to fill missing English cells. Supports the
same CSV formats as above.

```sh
deno run -A ..\parser\translate-qwen.ts ExternMessage.csv ExternMessage_qwen.csv
```

Environment overrides:

- `QWEN_BATCH_SIZE` (default: 8)
