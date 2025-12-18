# Translate MV / MZ

Need LocalLM / OpenAI endpoint accessible.
Usage:

```sh
game\data>deno run -A ..\parser\text-extractor.ts

game\data>deno run -A ..\parser\translate.ts ExternMessage.csv ExternMessage_Auto.csv

game\data>deno run -A ..\parser\clean.ts

mv ExternMessage_AutoClean.csv ExternMessage.csv
```

Plugin conf : `{"name":"ExternMessage","status":true,"description":"Include message from external file.","parameters":{"Line Max":"4","Csv File Path":"ExternMessage.csv","Csv File Encode":"utf-8","Use Name Tag":"true","Default Reference Column Index":"2","Fail Safe":"true"}}`

## Plugins.js text helper

Extract Japanese strings from `plugins.js` and export them to a CSV, then apply translations back (longest originals replaced first to avoid substring collisions).

```sh
# From the data folder (default paths target ../js/plugins.js)
deno run -A ..\parser\plugins-text.ts extract

# After filling the "translated" column in plugins_text.csv
deno run -A ..\parser\plugins-text.ts apply
```

You can override paths:

```sh
deno run -A ..\parser\plugins-text.ts extract path/to/plugins.js path/to/plugins_text.csv
deno run -A ..\parser\plugins-text.ts apply path/to/plugins.js path/to/plugins_text.csv
```
